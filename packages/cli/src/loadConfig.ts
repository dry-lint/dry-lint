import { cosmiconfig } from 'cosmiconfig';

export interface DryLintConfig {
  /** NPM package names of plugins to load */
  plugins?: string[];
  /** CLI flags that should override config */
  [key: string]: unknown;
}

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
  return (result?.config as DryLintConfig) ?? {};
}
