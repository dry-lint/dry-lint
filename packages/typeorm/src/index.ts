import { Declaration, registerExtractor } from '@dry-lint/dry-lint';
import { ClassDeclaration, Project } from 'ts-morph';

/**
 * Registers an extractor to parse TypeORM entity classes decorated with @Entity()
 * and emit entity declarations based on @Column() properties.
 */
registerExtractor((filePath, fileText): Declaration[] => {
  // Initialize an in-memory ts-morph project for parsing
  const project = new Project({ useInMemoryFileSystem: true });
  const sourceFile = project.createSourceFile(filePath, fileText);
  const declarations: Declaration[] = [];

  // Traverse each class declaration in the source file
  sourceFile.getClasses().forEach((cls: ClassDeclaration) => {
    // Only process classes decorated with @Entity()
    if (!cls.getDecorator('Entity')) return;

    // Extract the entity class name
    const entityName = cls.getName()!;

    // Collect all class properties, assuming they use @Column()
    const props = cls
      .getProperties()
      .map(prop => {
        const propName = prop.getName();
        const typeNode = prop.getTypeNode();
        const typeText = typeNode ? typeNode.getText().trim() : 'any';
        return { name: propName, type: typeText };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    // Emit a declaration for the TypeORM entity
    declarations.push({
      id: `${filePath}#typeorm:${entityName}`,
      kind: 'typeorm-entity',
      shape: { kind: 'Entity', name: entityName, props },
      location: { file: filePath, name: entityName },
    });
  });

  return declarations;
});
