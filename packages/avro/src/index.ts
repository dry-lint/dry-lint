import { Declaration, registerExtractor } from '@dry-lint/dry-lint';

/**
 * Represents a single field within an Avro record.
 */
interface AvroField {
  /** Field name */
  name: string;
  /** Field type definition */
  type: any;
}

/**
 * Describes the shape of an Avro record for duplicate detection.
 */
interface AvroShape {
  kind: 'record';
  /** Name of the Avro record */
  name: string;
  /** List of fields within the record */
  fields: AvroField[];
}

/**
 * Registers an extractor to parse Avro JSON schemas and emit record declarations.
 */
registerExtractor((filePath, fileText): Declaration[] => {
  let schema: any;

  // Attempt to parse the file text as JSON. If it fails, log and return no declarations.
  try {
    schema = JSON.parse(fileText);
  } catch (err) {
    console.error(`⚠️ Avro parse error in ${filePath}`, err);
    return [];
  }

  const declarations: Declaration[] = [];

  /**
   * Recursively collects named record definitions from the schema.
   * @param rec - The Avro type definition to process
   */
  function collectRecord(rec: any) {
    // Process only "record" types with a defined name
    if (rec.type === 'record' && typeof rec.name === 'string') {
      // Capture each field's name and type
      const fields: AvroField[] = (rec.fields ?? []).map((f: any) => ({
        name: f.name,
        type: f.type,
      }));

      // Create a declaration for this record
      declarations.push({
        id: `${filePath}#avro:${rec.name}`,
        kind: 'avro-record',
        shape: {
          kind: 'record',
          name: rec.name,
          fields,
        } as AvroShape,
        location: { file: filePath, name: rec.name },
      });

      // Recurse into nested record fields, if any
      rec.fields.forEach((f: any) => {
        if (f.type && typeof f.type === 'object') {
          collectRecord(f.type);
        }
      });
    }
  }

  // Begin collecting records from the root of the schema
  collectRecord(schema);

  return declarations;
});
