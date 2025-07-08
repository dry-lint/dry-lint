import yaml from 'js-yaml';
import { Declaration, registerExtractor } from '@dry-lint/dry-lint';

/**
 * Describes the shape of a Kubernetes resource for duplicate detection.
 */
interface K8sShape {
  /** Kubernetes resource kind (e.g., Deployment, Service) */
  kind: string;
  /** Metadata name of the resource */
  name: string;
  /** Spec section of the resource, containing its configuration */
  spec: any;
}

/**
 * Registers an extractor to parse Kubernetes YAML manifests,
 * extracting each document's kind, metadata.name, and spec.
 */
registerExtractor((filePath, fileText): Declaration[] => {
  let docs: any[];
  try {
    // Parse all YAML documents in the file
    docs = yaml.loadAll(fileText);
  } catch (err) {
    console.error(`⚠️ YAML parse error in ${filePath}`, err);
    return [];
  }

  const declarations: Declaration[] = [];

  // Iterate over each parsed document
  for (const doc of docs) {
    if (doc && typeof doc === 'object') {
      // Determine the resource kind or use a default
      const kind = typeof doc.kind === 'string' ? doc.kind : 'UnknownKind';
      // Extract metadata.name or fallback placeholder
      const metadata = doc.metadata as { name?: string };
      const name = metadata?.name || '<no-name>';

      // Emit a declaration for this resource
      declarations.push({
        id: `${filePath}#k8s:${kind}/${name}`,
        kind: `k8s-${kind.toLowerCase()}`,
        shape: { kind, name, spec: doc.spec } as K8sShape,
        location: { file: filePath, name },
      });
    }
  }

  return declarations;
});
