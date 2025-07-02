import { Declaration, registerExtractor } from '@dry-lint/core';
import { parse as parseHcl } from '@evops/hcl-terraform-parser';

/**
 * Shape of an HCL block declaration, representing resources or variables.
 */
interface HclShape {
  /** Always 'Block' for HCL constructs */
  kind: string;
  /** Type of block, e.g., resource type or 'variable' */
  type: string;
  /** Name identifier for the block */
  name: string;
  /** Optional attributes of the block, if populated */
  attributes?: Record<string, any>;
}

/**
 * Registers an extractor to parse Terraform HCL files (.tf), pulling out
 * managed_resources and variables as block declarations.
 */
registerExtractor((filePath, fileText): Declaration[] => {
  let doc: any;
  try {
    // Parse the HCL file into JSON-like structure
    doc = parseHcl(fileText);
  } catch (err) {
    console.error(`⚠️ HCL parse error in ${filePath}`, err);
    return [];
  }

  const declarations: Declaration[] = [];

  // Extract managed_resources entries as resource blocks
  for (const key of Object.keys(doc.managed_resources || {})) {
    const dotIndex = key.indexOf('.');
    if (dotIndex === -1) continue; // skip invalid keys
    const type = key.slice(0, dotIndex);
    const name = key.slice(dotIndex + 1);

    declarations.push({
      id: `${filePath}#hcl:resource/${key}`,
      kind: 'hcl-Block',
      shape: {
        kind: 'Block',
        type,
        name,
        attributes: {}, // populate from doc.managed_resources[key].attributes if desired
      } as HclShape,
      location: { file: filePath, name },
    });
  }

  // Extract variables entries as variable blocks
  for (const varName of Object.keys(doc.variables || {})) {
    declarations.push({
      id: `${filePath}#hcl:variable/${varName}`,
      kind: 'hcl-Block',
      shape: {
        kind: 'Block',
        type: 'variable',
        name: varName,
        attributes: {}, // populate from doc.variables[varName] if needed
      } as HclShape,
      location: { file: filePath, name: varName },
    });
  }

  return declarations;
});
