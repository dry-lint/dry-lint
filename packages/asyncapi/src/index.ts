import { Declaration, registerExtractor } from '@dry-lint/dry-lint';
import YAML from 'yaml';

/**
 * Defines the shape of an AsyncAPI message declaration.
 */
interface AsyncAPIShape {
  /** Name of the channel where the message is published or subscribed */
  channel: string;
  /** Identifier for the message within the channel */
  messageName: string;
  /** JSON schema for the message payload */
  payloadSchema: any;
}

/**
 * Extracts AsyncAPI message declarations from a file.
 * Supports JSON and YAML document formats.
 */
registerExtractor((filePath, fileText): Declaration<AsyncAPIShape>[] => {
  if (!filePath.endsWith('.json') && !filePath.endsWith('.yaml') && !filePath.endsWith('.yml')) {
    return [];
  }

  let doc: any;

  // Attempt to parse the file as JSON, fallback to YAML if JSON parsing fails
  try {
    doc = JSON.parse(fileText);
  } catch {
    try {
      doc = YAML.parse(fileText);
    } catch (err) {
      console.error(`⚠️ AsyncAPI parse error in ${filePath}`, err);
      return [];
    }
  }

  const declarations: Declaration<AsyncAPIShape>[] = [];
  const channels = doc.channels;

  // Ensure channels is an object before iterating
  if (channels && typeof channels === 'object') {
    for (const channelName of Object.keys(channels)) {
      const channelDef = channels[channelName];

      // Process both publish and subscribe operations
      for (const operation of ['publish', 'subscribe'] as const) {
        const opDef = channelDef[operation];
        if (!opDef) continue;

        // Normalize message(s) into an array
        const rawMessage = opDef.message;
        const messages = Array.isArray(rawMessage) ? rawMessage : [rawMessage];

        for (const message of messages) {
          // Determine the message title from either 'name' or '$ref'
          const title =
            typeof message.name === 'string'
              ? message.name
              : typeof message.$ref === 'string'
                ? message.$ref.split('/').pop()!
                : undefined;
          if (!title) continue;

          // Collect the payload schema for the message
          const payloadSchema = message.payload;

          declarations.push({
            id: `${filePath}#asyncapi:${channelName}:${operation}:${title}`,
            kind: 'asyncapi-message',
            shape: {
              channel: channelName,
              messageName: title,
              payloadSchema,
            } as AsyncAPIShape,
            location: { file: filePath, name: `${channelName}.${title}` },
          });
        }
      }
    }
  }

  return declarations;
});
