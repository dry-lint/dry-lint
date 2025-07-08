import { Declaration, registerExtractor } from '@dry-lint/dry-lint';
import { Parser } from 'node-sql-parser';

// Initialize a SQL parser instance targeting MySQL dialect
const parser = new Parser();

/**
 * SQL extractor plugin:
 * - Parses SQL DDL statements (CREATE TABLE)
 * - Extracts table names and column definitions
 * - Emits a declaration for each table with its columns
 */
registerExtractor((filePath, fileText): Declaration[] => {
  let ast: any;
  try {
    // Attempt to parse the file's SQL contents into an AST
    ast = parser.astify(fileText, { database: 'MySQL' });
  } catch (err) {
    // On parse errors, log and skip this file
    console.error(`⚠️ SQL parse error in ${filePath}`, err);
    return [];
  }

  // The AST may represent multiple statements; normalize to an array
  const statements = Array.isArray(ast) ? ast : [ast];
  const declarations: Declaration[] = [];

  // Iterate over each statement to find CREATE TABLE definitions
  for (const stmt of statements) {
    if (stmt.type === 'create') {
      // Extract table name
      const tableName = stmt.table[0].table;

      // Collect column definitions from the create_definitions array
      const columns = (stmt.create_definitions || [])
        .filter((def: any) => def.resource === 'column')
        .map((col: any) => ({
          name: col.column.column,
          type: col.definition.dataType,
        }))
        .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));

      // Emit a declaration representing this table and its columns
      declarations.push({
        id: `${filePath}#table:${tableName}`,
        kind: 'sql-table',
        shape: { kind: 'table', name: tableName, columns },
        location: { file: filePath, name: tableName },
      });
    }
  }

  return declarations;
});
