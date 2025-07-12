import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { findDuplicates } from '@dry-lint/dry-lint';
import './index';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'dry-xsd-'));
const write = (dir: string, name: string, content: string) =>
  fs.writeFileSync(path.join(dir, name), content);

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

describe('XSD extractor plugin', () => {
  it('ignores non-.xsd files', async () => {
    const dir = tmp();
    write(dir, 'dummy.txt', '<schema/>');
    const groups = await findDuplicates([path.join(dir, 'dummy.txt')], {
      threshold: 1,
      json: true,
    });
    expect(groups).toEqual([]);
  });

  it('returns empty on malformed XML without throwing', async () => {
    const dir = tmp();
    const fileA = path.join(dir, 'bad.xsd');
    const fileB = path.join(dir, 'bad2.xsd');
    write(dir, 'bad.xsd', '<xs:schema><unclosed></xs:schema>');
    write(dir, 'bad2.xsd', '<xs:schema><unclosed></xs:schema>');

    const groups = await findDuplicates([fileA, fileB], { threshold: 1, json: true });
    expect(groups).toEqual([]);
  });

  it('returns empty when no <schema> element is present', async () => {
    const dir = tmp();
    const file = path.join(dir, 'noschema.xsd');
    write(dir, 'noschema.xsd', '<root></root>');
    const groups = await findDuplicates([file], { threshold: 1, json: true });
    expect(groups).toEqual([]);
  });

  it('extracts complexType and simpleType definitions (no duplicates in single file)', async () => {
    const dir = tmp();
    const file = path.join(dir, 'schema.xsd');
    write(dir, 'schema.xsd', xsdSample);

    const groups = await findDuplicates([file], { threshold: 1, json: true });

    expect(groups).toHaveLength(0);
  });

  it('detects duplicate type definitions across multiple XSD files', async () => {
    const dir = tmp();
    const a = path.join(dir, 'a.xsd');
    const b = path.join(dir, 'b.xsd');
    write(dir, 'a.xsd', xsdSample);
    write(dir, 'b.xsd', xsdSample);

    const groups = await findDuplicates([a, b], { threshold: 1, json: true });

    expect(groups).toHaveLength(2);

    groups.forEach(g => expect(g.similarity).toBe(1));
    const names = groups.map(g => g.decls[0]!.location.name).sort();
    expect(names).toEqual(['Color', 'Person']);
  });

  it('handles single-element sequence in complexType across two files', async () => {
    const singleSeq = `
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:complexType name="Only">
    <xs:sequence>
      <xs:element name="only" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
</xs:schema>
`;
    const dir = tmp();
    const a = path.join(dir, 'one.xsd');
    const b = path.join(dir, 'two.xsd');
    write(dir, 'one.xsd', singleSeq);
    write(dir, 'two.xsd', singleSeq);

    const groups = await findDuplicates([a, b], { threshold: 1, json: true });
    expect(groups).toHaveLength(1);

    const fields = (groups[0]!.decls[0]!.shape as any).fields as Array<{
      name: string;
      type?: string;
    }>;
    expect(fields).toEqual([{ name: 'only', type: 'string' }]);
  });
});
