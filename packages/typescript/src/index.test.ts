import {
  IntersectionTypeNode,
  MappedTypeNode,
  Project,
  TupleTypeNode,
  TypeLiteralNode,
  TypeReferenceNode,
  UnionTypeNode,
} from 'ts-morph';
import { describe, expect, it } from 'vitest';
import {
  normalizeEnum,
  normalizeInterface,
  normalizeIntersection,
  normalizeMapped,
  normalizeReference,
  normalizeTuple,
  normalizeTypeAlias,
  normalizeTypeLiteral,
  normalizeUnion,
} from './index';

function createSource(code: string) {
  const project = new Project({ useInMemoryFileSystem: true });
  project.createSourceFile('test.ts', code);
  return project.getSourceFileOrThrow('test.ts');
}

describe('TypeScript normalization helpers', () => {
  it('normalizes interface props order and metadata', () => {
    const code = `interface Foo<T=string> {
      readonly b?: number;
      a: string;
    }`;
    const sf = createSource(code);
    const iface = sf.getInterfaceOrThrow('Foo');
    const norm = normalizeInterface(iface);
    expect(norm.kind).toBe('Interface');
    expect(norm.name).toBe('Foo');
    expect(norm.typeParams).toEqual([{ name: 'T', constraint: null, default: 'string' }]);
    expect(norm.props).toEqual([
      { name: 'a', optional: false, readonly: false, type: 'string' },
      { name: 'b', optional: true, readonly: true, type: 'number' },
    ]);
  });

  it('normalizes type alias of union and intersection', () => {
    const code = `
      type U = A | B;
      type I = X & Y;
    `;
    const sf = createSource(code);
    const aliasU = sf.getTypeAliasOrThrow('U');
    const aliasI = sf.getTypeAliasOrThrow('I');
    const normU = normalizeTypeAlias(aliasU);
    const normI = normalizeTypeAlias(aliasI);
    expect(normU.kind).toBe('TypeAlias');
    expect(normU.name).toBe('U');
    expect(normU.value.kind).toBe('Union');
    expect(normI.value.kind).toBe('Intersection');
  });

  it('normalizes enums sorted by name', () => {
    const code = `enum E { Z=3, A=1, M=2 }`;
    const sf = createSource(code);
    const en = sf.getEnumOrThrow('E');
    const norm = normalizeEnum(en);
    expect(norm.members.map((m: any) => m.name)).toEqual(['A', 'M', 'Z']);
  });

  it('normalizes type literal and index signature', () => {
    const code = `type X = { c: boolean; a: string; [k: string]: number }`;
    const sf = createSource(code);
    const alias = sf.getTypeAliasOrThrow('X');
    const norm = normalizeTypeAlias(alias).value;
    expect(norm.kind).toBe('TypeLiteral');
    expect(norm.members.map((m: any) => m.name)).toEqual(['a', 'c']);
    expect(Array.isArray(norm.index)).toBe(true);
    expect(norm.index[0].kind).toBe('Index');
  });

  it('normalizes tuple, mapped, and reference', () => {
    const code = `
      type Tup = [string, number];
      type Map = { [K in 'a'|'b']: boolean };
      type Ref = Promise<string>;
    `;
    const sf = createSource(code);
    const tup = sf.getTypeAliasOrThrow('Tup');
    const map = sf.getTypeAliasOrThrow('Map');
    const ref = sf.getTypeAliasOrThrow('Ref');
    const normT = normalizeTypeAlias(tup).value;
    const normM = normalizeTypeAlias(map).value;
    const normR = normalizeTypeAlias(ref).value;
    expect(normT.kind).toBe('Tuple');
    expect(normM.kind).toBe('Mapped');
    expect(normR.kind).toBe('Reference');
    expect(normR.name).toBe('Promise');
  });

  // Additional direct tests for each helper
  it('normalizeTypeLiteral works on direct literal nodes', () => {
    const code = `type L = { b: boolean; a: number }`;
    const sf = createSource(code);
    const alias = sf.getTypeAliasOrThrow('L');
    const litNode = alias.getTypeNodeOrThrow() as TypeLiteralNode;
    const litNorm = normalizeTypeLiteral(litNode);
    expect(litNorm.kind).toBe('TypeLiteral');
    expect(litNorm.members.map((m: any) => m.name)).toEqual(['a', 'b']);
  });

  it('normalizeUnion works standalone', () => {
    const code = `type U2 = 'x' | 'y' | 'z';`;
    const sf = createSource(code);
    const alias = sf.getTypeAliasOrThrow('U2');
    const unionNode = alias.getTypeNodeOrThrow() as UnionTypeNode;
    const uniNorm = normalizeUnion(unionNode);
    expect(uniNorm.kind).toBe('Union');
    expect(uniNorm.types).toHaveLength(3);
  });

  it('normalizeIntersection works standalone', () => {
    const code = `type I2 = A & B & C;`;
    const sf = createSource(code);
    const alias = sf.getTypeAliasOrThrow('I2');
    const interNode = alias.getTypeNodeOrThrow() as IntersectionTypeNode;
    const intNorm = normalizeIntersection(interNode);
    expect(intNorm.kind).toBe('Intersection');
    expect(intNorm.types).toHaveLength(3);
  });

  it('normalizeMapped works standalone', () => {
    const code = `type M2 = { [P in 'r'|'g'|'b']: number };`;
    const sf = createSource(code);
    const alias = sf.getTypeAliasOrThrow('M2');
    const mapNode = alias.getTypeNodeOrThrow() as MappedTypeNode;
    const mNorm = normalizeMapped(mapNode);
    expect(mNorm.kind).toBe('Mapped');
    expect(mNorm.key).toBe('P');
  });

  it('normalizeReference works standalone', () => {
    const code = `type R2 = Array<number>;`;
    const sf = createSource(code);
    const alias = sf.getTypeAliasOrThrow('R2');
    const refNode = alias.getTypeNodeOrThrow() as TypeReferenceNode;
    const rNorm = normalizeReference(refNode);
    expect(rNorm.kind).toBe('Reference');
    expect(rNorm.name).toBe('Array');
    expect(rNorm.args).toHaveLength(1);
  });

  it('normalizes tuple types', () => {
    const code = `type T2 = [string, number, boolean];`;
    const sf = createSource(code);
    const alias = sf.getTypeAliasOrThrow('T2');
    const tupNode = alias.getTypeNodeOrThrow() as TupleTypeNode;
    const tNorm = normalizeTuple(tupNode);
    expect(tNorm.kind).toBe('Tuple');
    expect(Array.isArray(tNorm.elements)).toBe(true);
    expect(tNorm.elements).toHaveLength(3);
    // Check element types in order
    expect(tNorm.elements[0]).toBe('string');
    expect(tNorm.elements[1]).toBe('number');
    expect(tNorm.elements[2]).toBe('boolean');
  });
});
