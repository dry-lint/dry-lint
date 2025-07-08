import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import '../src/index';
import { findDuplicates } from '@dry-lint/dry-lint';

/**
 * Sample XSD schema containing one complexType and one simpleType definition.
 */
const xsdSample = `
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:complexType name="Person">
    <xs:sequence>
      <xs:element name="id" type="xs:int"/>
      <xs:element name="name" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
  <xs:simpleType name="Color">
    <xs:restriction base="xs:string">
      <xs:enumeration value="RED"/>
      <xs:enumeration value="GREEN"/>
      <xs:enumeration value="BLUE"/>
    </xs:restriction>
  </xs:simpleType>
</xs:schema>
`;

describe('XSD plugin', () => {
  it('extracts complexType and simpleType definitions without duplicates', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dry-xsd-'));
    const schemaFile = path.join(tmpDir, 'schema.xsd');
    fs.writeFileSync(schemaFile, xsdSample);

    const groups = await findDuplicates([schemaFile], { threshold: 1, json: true });
    expect(groups).toHaveLength(0);
  });

  it('detects duplicate type definitions across multiple XSD files', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dry-xsd-dup-'));
    const fileA = path.join(tmpDir, 'a.xsd');
    const fileB = path.join(tmpDir, 'b.xsd');
    fs.writeFileSync(fileA, xsdSample);
    fs.writeFileSync(fileB, xsdSample);

    const groups = await findDuplicates([fileA, fileB], { threshold: 1, json: true });
    expect(groups).toHaveLength(2);
    groups.forEach(g => expect(g.similarity).toBe(1));

    const dupNames = groups.map(g => g.decls[0]!.location.name).sort();
    expect(dupNames).toEqual(['Color', 'Person']);
  });

  it('returns empty on malformed XML', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dry-xsd-bad-'));
    const badFile = path.join(tmpDir, 'bad.xsd');
    fs.writeFileSync(badFile, '<xs:schema><unclosed></xs:schema>');

    const groups = await findDuplicates([badFile], { threshold: 1, json: true });
    expect(groups).toHaveLength(0);
  });

  it('returns empty when no <schema> element is present', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dry-xsd-noschema-'));
    const noSchemaFile = path.join(tmpDir, 'noschema.xsd');
    fs.writeFileSync(noSchemaFile, '<root></root>');

    const groups = await findDuplicates([noSchemaFile], { threshold: 1, json: true });
    expect(groups).toHaveLength(0);
  });
});
