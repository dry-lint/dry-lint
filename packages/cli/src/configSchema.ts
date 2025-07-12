import { z } from 'zod/v4-mini';
import os from 'node:os';

export const configSchema = z.looseObject({
  cache: z._default(z.boolean(), true),
  fix: z._default(z.boolean(), false),
  ignore: z._default(z.array(z.string()), []),
  json: z._default(z.boolean(), false),
  out: z.optional(z.string()),
  plugins: z.optional(z.array(z.string())),
  pool: z._default(z.number().check(z.int(), z.gte(1)), os.cpus().length),
  progress: z._default(z.boolean(), true),
  sarif: z._default(z.boolean(), false),
  threshold: z._default(z.number().check(z.gte(0), z.lte(1)), 1),
  ui: z._default(z.boolean(), false),
});
export type DryLintConfig = z.infer<typeof configSchema>;
