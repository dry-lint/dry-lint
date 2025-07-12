import { Declaration, registerExtractor } from '@dry-lint/dry-lint';
import { XMLParser } from 'fast-xml-parser';

/**
 * Represents a field within an XSD complex type, including its name and optional type.
 */
interface XsdField {
  /** Name of the element */
  name: string;
  /** Data type of the element, e.g., 'string', 'int' (optional if unspecified) */
  type?: string;
}

/**
 * Describes the shape of an XSD type for duplicate detection.
 */
interface XsdShape {
  /** Kind of XSD type: 'complexType' or 'simpleType' */
  kind: 'complexType' | 'simpleType';
  /** Name of the type as defined by the $name attribute */
  name: string;
  /** Sequence of element fields (for complex types) */
  fields?: XsdField[];
  /** Enumeration values (for simple types) */
  enumeration?: string[];
}

// Configure the XML parser to strip 'xs:' prefixes and preserve attributes with '$' prefix
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '$',
  tagValueProcessor: (_tagName, value) => value,
  transformTagName: tagName => tagName.replace(/^xs:/, ''),
});

/**
 * Normalize an XSD <complexType> definition into an XsdShape.
 * Extracts the sequence elements as fields.
 * @param def Parsed complexType object
 * @returns An XsdShape with kind 'complexType'
 */
function normalizeComplex(def: any): XsdShape {
  const name = def.$name;
  // sequence.element may be a single object or an array
  const elems = def.sequence?.element
    ? Array.isArray(def.sequence.element)
      ? def.sequence.element
      : [def.sequence.element]
    : [];

  // Map each element to an XsdField
  const fields: XsdField[] = elems.map((el: any) => ({
    name: el.$name,
    // Remove namespace prefix from type (e.g. 'xs:string' -> 'string')
    type: el.$type?.split(':').pop(),
  }));

  return { kind: 'complexType', name, fields };
}

/**
 * Normalize an XSD <simpleType> definition into an XsdShape.
 * Extracts enumeration values from the restriction.
 * @param def Parsed simpleType object
 * @returns An XsdShape with kind 'simpleType'
 */
function normalizeSimple(def: any): XsdShape {
  const name = def.$name;
  // restriction.enumeration may be single or array
  const enums = def.restriction?.enumeration
    ? Array.isArray(def.restriction.enumeration)
      ? def.restriction.enumeration
      : [def.restriction.enumeration]
    : [];

  // Extract the $value attribute of each enumeration
  const values = enums
    .map((e: any) => e.$value)
    .filter((v: any): v is string => typeof v === 'string');

  return { kind: 'simpleType', name, enumeration: values };
}

/**
 * Registers an extractor to parse XSD schema files (.xsd), handling both
 * complexType and simpleType definitions for duplicate detection.
 */
registerExtractor((filePath, fileText): Declaration<XsdShape>[] => {
  if (!filePath.endsWith('.xsd')) {
    return [];
  }

  let parsed: any;
  try {
    // Parse the XSD XML into a JavaScript object
    parsed = parser.parse(fileText);
  } catch (err) {
    console.error(`⚠️ XSD parse error in ${filePath}`, err);
    return [];
  }

  const schema = parsed.schema;
  if (!schema) {
    // No <schema> root element found
    return [];
  }

  const declarations: Declaration<XsdShape>[] = [];

  // Extract complexType definitions (array or single)
  const complexes = Array.isArray(schema.complexType)
    ? schema.complexType
    : schema.complexType != null
      ? [schema.complexType]
      : [];
  for (const def of complexes) {
    const shape = normalizeComplex(def);
    declarations.push({
      id: `${filePath}#xsd:complexType:${shape.name}`,
      kind: 'xsd-complexType',
      shape,
      location: { file: filePath, name: shape.name },
    });
  }

  // Extract simpleType definitions (array or single)
  const simples = Array.isArray(schema.simpleType)
    ? schema.simpleType
    : schema.simpleType != null
      ? [schema.simpleType]
      : [];
  for (const def of simples) {
    const shape = normalizeSimple(def);
    declarations.push({
      id: `${filePath}#xsd:simpleType:${shape.name}`,
      kind: 'xsd-simpleType',
      shape,
      location: { file: filePath, name: shape.name },
    });
  }

  return declarations;
});
