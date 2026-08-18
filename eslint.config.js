import js from '@eslint/js';
import globals from 'globals';
import astro from 'eslint-plugin-astro';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    ignores: [
      'dist/**',
      '.astro/**',
      'node_modules/**',
      'docs/mockups/**', // reference artefacts, never served — not our code
      'scrapers/harvest_output/**',
    ],
  },

  js.configs.recommended,
  ...astro.configs.recommended,

  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      // CLAUDE.md §8: no debug logging in production paths.
      // console.error is allowed so real failures stay reportable.
      'no-console': ['error', { allow: ['error'] }],

      // Defence in depth against the XSS rule in §8. Data-derived strings
      // must never reach innerHTML; these make an accident loud at lint time.
      'no-restricted-properties': [
        'error',
        {
          property: 'innerHTML',
          message:
            'innerHTML is banned (CLAUDE.md §8). Scraped gym data is untrusted input — use textContent or an Astro expression.',
        },
        {
          property: 'outerHTML',
          message: 'outerHTML is banned (CLAUDE.md §8). Use textContent.',
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'eval', message: 'eval is banned (CLAUDE.md §8).' },
      ],

      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'always'],
    },
  },

  {
    // Astro frontmatter is TypeScript, so the .astro parser needs a TS parser
    // for the fenced block (Props interfaces and the like).
    files: ['**/*.astro'],
    languageOptions: {
      parserOptions: { parser: tsParser, extraFileExtensions: ['.astro'] },
    },
  },

  {
    // Node-side build/validation scripts may log progress to stdout.
    files: ['scripts/**/*.mjs', '*.config.mjs', 'eslint.config.js'],
    rules: { 'no-console': 'off' },
  },
];
