import { Declaration, registerExtractor } from '@dry-lint/dry-lint';
import { getSchema } from '@mrleebo/prisma-ast';

/* -------------------------------------------------------------------------- */
/* Helper guards – tolerate both 0.x and 1.x node.type spellings              */
const isModelNode = (t: string) => t === 'model' || t === 'model_declaration';

const isEnumNode = (t: string) => t === 'enum' || t === 'enum_declaration';

/* -------------------------------------------------------------------------- */

/** Shape handed to the duplicate-detector */
interface PrismaShape {
  kind: 'model' | 'enum';
  name: string;
  fields?: { name: string; type: string }[];
  values?: string[];
}

const stripDsGen = (src: string) =>
  src.replace(/^\s*(?:datasource|generator)\s+\w+\s*{[\s\S]*?}\s*/gim, '');

/** put a line-break after “{” so `getSchema` accepts compact bodies */
const breakInlineBody = (src: string) =>
  src.replace(
    /^(model|enum)\s+(\w+)\s*{\s*([^\n{}][^}]*)}$/gim,
    (_m, kw, name, body) => `${kw} ${name} {\n  ${body.trim()}\n}`
  );

registerExtractor((filePath, fileText): Declaration<PrismaShape>[] => {
  if (!filePath.endsWith('.prisma')) return [];

  const cleaned = breakInlineBody(stripDsGen(fileText));

  /* -------------------------------------------------------- */
  /* 1. Parse once – if it fails, retry after stripping        */
  /*    datasource / generator blocks (non-greedy, per block) */
  /* -------------------------------------------------------- */
  let ast;
  try {
    ast = getSchema(cleaned);
  } catch (err) {
    console.error(`⚠️ Prisma schema parse error in ${filePath}`, err);
    return [];
  }

  const decls: Declaration<PrismaShape>[] = [];

  for (const raw of ast.list ?? []) {
    const t = (raw as { type: string }).type; // widen literal-union → string

    /* ───────── models ───────── */
    if (isModelNode(t)) {
      const node = raw as any;
      const props = Array.isArray(node.properties) ? node.properties : [];

      const fields = props
        .filter((p: any) => p.type === 'field')
        .map((f: any) => ({ name: f.name, type: f.fieldType }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name));

      decls.push({
        id: `${filePath}#model:${node.name}`,
        kind: 'prisma-model',
        shape: { kind: 'model', name: node.name, fields },
        location: { file: filePath, name: node.name },
      });
    }

    /* ───────── enums ───────── */
    if (isEnumNode(t)) {
      const node = raw as any;
      const props = Array.isArray(node.properties) ? node.properties : [];
      const values = props.map((p: any) => p.name).sort();

      decls.push({
        id: `${filePath}#enum:${node.name}`,
        kind: 'prisma-enum',
        shape: { kind: 'enum', name: node.name, values },
        location: { file: filePath, name: node.name },
      });
    }
  }

  return decls;
});
