import path from 'path';
import postcss, { AtRule, Declaration as CssDecl, Root, Rule } from 'postcss';
import syntaxScss from 'postcss-scss';
import syntaxLess from 'postcss-less';
import { Declaration, registerExtractor } from '@dry-lint/core';

/**
 * Registers an extractor to parse CSS, SCSS, and Less files and emit
 * declarations for classes, custom properties, preprocessor variables, and mixins.
 */
registerExtractor((filePath, fileText): Declaration[] => {
  // Determine parser syntax based on file extension
  const ext = path.extname(filePath).toLowerCase();
  const syntax = ext === '.scss' ? syntaxScss : ext === '.less' ? syntaxLess : undefined;

  let root: Root;
  try {
    // Parse the stylesheet using PostCSS, applying SCSS or Less syntax if needed
    const opts: any = {};
    if (syntax) opts.syntax = syntax;
    root = postcss.parse(fileText, opts);
  } catch (err) {
    // Log parsing errors and skip this file
    console.error(`⚠️ CSS parse error in ${filePath}`, err);
    return [];
  }

  const decls: Declaration[] = [];

  // 1) Collect class selector declarations
  root.walkRules((rule: Rule) => {
    for (const sel of rule.selector.split(/,\s*/)) {
      const m = sel.match(/\.([A-Za-z0-9_-]+)/);
      if (m && m[1]) {
        const className = m[1];
        decls.push({
          id: `${filePath}#css-class:${className}`,
          kind: 'css-class',
          shape: { selector: `.${className}` },
          location: { file: filePath, name: className },
        });
      }
    }
  });

  // 2) Collect CSS custom properties (--var) and preprocessor variables ($var, @var)
  root.walkDecls((decl: CssDecl) => {
    const propName = decl.prop.trim();
    if (propName.startsWith('--')) {
      // Native CSS custom property
      const name = propName.slice(2);
      decls.push({
        id: `${filePath}#css-var:${name}`,
        kind: 'css-var',
        shape: { name, value: decl.value.trim() },
        location: { file: filePath, name },
      });
    } else if (propName.startsWith('$') || propName.startsWith('@')) {
      // SCSS/Less variable
      const name = propName.slice(1);
      decls.push({
        id: `${filePath}#css-prevar:${name}`,
        kind: 'css-prevar',
        shape: { name, value: decl.value.trim() },
        location: { file: filePath, name },
      });
    }
  });

  // 3) Collect mixins and includes (@mixin in SCSS, @include in Less)
  root.walkAtRules((atRule: AtRule) => {
    if (atRule.name === 'mixin' || atRule.name === 'include') {
      // Extract the mixin name before any parameters
      const mixinName = atRule.params.split(/\s|\(/)[0]!;
      decls.push({
        id: `${filePath}#css-mixin:${mixinName}`,
        kind: 'css-mixin',
        shape: { name: mixinName },
        location: { file: filePath, name: mixinName },
      });
    }
  });

  return decls;
});
