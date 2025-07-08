import { Declaration, registerExtractor } from '@dry-lint/dry-lint';
import { ClassDeclaration, Project } from 'ts-morph';

/**
 * Registers an extractor to parse TypeScript classes decorated with @Schema()
 * and emit Mongoose schema declarations based on @Prop() properties.
 */
registerExtractor((filePath, fileText): Declaration[] => {
  // Initialize an in-memory ts-morph project to parse the source text
  const project = new Project({ useInMemoryFileSystem: true });
  const sourceFile = project.createSourceFile(filePath, fileText);
  const declarations: Declaration[] = [];

  // Iterate over all class declarations in the file
  sourceFile.getClasses().forEach((cls: ClassDeclaration) => {
    // Only process classes decorated with @Schema()
    if (!cls.getDecorator('Schema')) return;

    const schemaName = cls.getName()!;

    // Collect all class properties, assuming they use @Prop decorator
    const props = cls
      .getProperties()
      .map(prop => {
        const name = prop.getName();
        const typeNode = prop.getTypeNode();
        const typeText = typeNode ? typeNode.getText().trim() : 'any';
        return { name, type: typeText };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    // Emit a declaration for the Mongoose schema
    declarations.push({
      id: `${filePath}#mongoose:${schemaName}`,
      kind: 'mongoose-schema',
      shape: { kind: 'MongooseSchema', name: schemaName, props },
      location: { file: filePath, name: schemaName },
    });
  });

  return declarations;
});
