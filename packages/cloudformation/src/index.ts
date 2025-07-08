import { Declaration, registerExtractor } from '@dry-lint/dry-lint';
import yaml from 'js-yaml';

/**
 * Describes the shape of a CloudFormation resource for duplicate detection.
 */
interface CfnShape {
  /** Resource type (e.g., AWS::S3::Bucket) */
  type: string;
  /** Optional properties object defining resource configuration */
  properties?: any;
}

/**
 * Registers an extractor to parse CloudFormation templates (JSON or YAML)
 * and emit resource declarations.
 */
registerExtractor((filePath, fileText): Declaration[] => {
  let template: any;

  // Attempt JSON parse first, fallback to YAML if JSON parsing fails
  try {
    template = JSON.parse(fileText);
  } catch {
    try {
      template = yaml.load(fileText);
    } catch (err) {
      console.error(`⚠️ CloudFormation parse error in ${filePath}`, err);
      return [];
    }
  }

  const declarations: Declaration[] = [];
  const resources = template?.Resources;

  // Ensure Resources section exists and is an object
  if (resources && typeof resources === 'object') {
    // Iterate over each logical resource ID and definition
    for (const [logicalId, resource] of Object.entries(resources)) {
      if (resource && typeof resource === 'object') {
        declarations.push({
          id: `${filePath}#cloudformation:Resource/${logicalId}`,
          kind: 'cfn-resource',
          shape: {
            type: (resource as any).Type,
            properties: (resource as any).Properties,
          } as CfnShape,
          location: { file: filePath, name: logicalId },
        });
      }
    }
  }

  return declarations;
});
