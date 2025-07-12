import { Declaration, registerExtractor } from '@dry-lint/dry-lint';
import {
  CallExpression,
  ClassDeclaration,
  ObjectLiteralExpression,
  Project,
  PropertyAssignment,
  SyntaxKind,
} from 'ts-morph';

interface MongooseShape {
  kind: 'MongooseSchema' | 'MongooseModel';
  name: string;
  props?: string[];
}

/**
 * Registers an extractor to parse TypeScript classes decorated with @Schema()
 * and emit Mongoose schema declarations based on @Prop() properties.
 */
registerExtractor((filePath, fileText): Declaration<MongooseShape>[] => {
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.cts') && !filePath.endsWith('.mts')) {
    return [];
  }

  // Initialize an in-memory ts-morph project to parse the source text
  const project = new Project({ useInMemoryFileSystem: true });
  const sourceFile = project.createSourceFile(filePath, fileText);
  const declarations: Declaration<MongooseShape>[] = [];

  sourceFile.getClasses().forEach((cls: ClassDeclaration) => {
    if (!cls.getDecorator('Schema')) return;

    const schemaName = cls.getName() ?? 'AnonymousSchema';

    const props = cls
      .getProperties()
      .filter(p => !!p.getDecorator('Prop'))
      .map(p => p.getName())
      .sort();

    declarations.push({
      id: `${filePath}#mongoose-schema:${schemaName}`,
      kind: 'mongoose-schema',
      shape: { kind: 'MongooseSchema', name: schemaName, props },
      location: { file: filePath, name: schemaName },
    });
  });

  sourceFile.forEachDescendant(node => {
    if (node.getKind() !== SyntaxKind.CallExpression) return;

    const call = node as CallExpression;
    const calleeText = call.getExpression().getText();

    // match  foo.model(...)   or   mongoose.model(...)
    if (!/\.model$/.test(calleeText)) return;

    const [nameArg, schemaArg] = call.getArguments();
    if (!nameArg || !schemaArg || !nameArg.isKind(SyntaxKind.StringLiteral)) return;

    const modelName = nameArg.getText().slice(1, -1); // strip quotes
    let propNames: string[] | undefined;

    // try to grab `{ id: String, ... }` from new Schema({...})
    if (
      schemaArg.isKind(SyntaxKind.NewExpression) &&
      schemaArg.getArguments().length &&
      schemaArg.getArguments()[0]!.isKind(SyntaxKind.ObjectLiteralExpression)
    ) {
      propNames = (schemaArg.getArguments()[0] as ObjectLiteralExpression)
        .getProperties()
        .filter(p => p.getKind() === SyntaxKind.PropertyAssignment)
        .map(p => (p as PropertyAssignment).getName())
        .filter(Boolean)
        .sort();
    }

    declarations.push({
      id: `${filePath}#mongoose-model:${modelName}`,
      kind: 'mongoose-model',
      shape: { kind: 'MongooseModel', name: modelName, props: propNames },
      location: { file: filePath, name: modelName },
    });
  });

  return declarations;
});
