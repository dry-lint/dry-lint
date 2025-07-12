import { cosmiconfig } from 'cosmiconfig';
import { configSchema, DryLintConfig } from './configSchema.js';

export async function loadConfig(cwd = process.cwd()): Promise<DryLintConfig> {
  const explorer = cosmiconfig('drylint', {
    searchPlaces: [
      'package.json',
      '.drylintrc',
      '.drylintrc.json',
      '.drylintrc.yaml',
      '.drylintrc.yml',
      '.drylintrc.js',
      '.drylintrc.cjs',
    ],
  });

  const result = await explorer.search(cwd);
  const raw = result?.config ?? {};

  const parsed = configSchema.safeParse(raw);
  if (!parsed.success) {
    console.error('❌  Invalid .drylintrc\n');
    for (const e of parsed.error.issues) {
      console.error(`• ${e.path.join('.')}: ${e.message}`);
    }
    process.exit(1);
  }
  return parsed.data;
}
