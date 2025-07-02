import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import '../src/index';
import { findDuplicates } from '@dry-lint/core';

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
    // Create a temporary directory and write the XSD sample to a file
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dry-xsd-'));
    const schemaFile = path.join(tmpDir, 'schema.xsd');
    fs.writeFileSync(schemaFile, xsdSample);

    // Run duplicate detection at full similarity threshold
    const groups = await findDuplicates([schemaFile], { threshold: 1, json: true });

    // Expect two distinct type declarations (Person, Color) → no duplicate groups
    expect(groups).toHaveLength(0);
  });

  it('detects duplicate type definitions across multiple XSD files', async () => {
    // Prepare two XSD files with identical content
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dry-xsd-dup-'));
    const fileA = path.join(tmpDir, 'a.xsd');
    const fileB = path.join(tmpDir, 'b.xsd');
    fs.writeFileSync(fileA, xsdSample);
    fs.writeFileSync(fileB, xsdSample);

    // Run duplicate detection on both files
    const groups = await findDuplicates([fileA, fileB], { threshold: 1, json: true });

    // We should get two duplicate groups: one for each type name
    expect(groups).toHaveLength(2);
    // All groups should have perfect similarity
    groups.forEach(g => expect(g.similarity).toBe(1));

    // Extract the duplicated type names for verification
    const dupNames = groups.map(g => g.decls[0]!.location.name).sort();
    expect(dupNames).toEqual(['Color', 'Person']);
  });
});
