import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';
import tsParser from '@typescript-eslint/parser';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [
    // Global ignores — replaces the `.eslintignore` file, unsupported since ESLint 9.
    {
        ignores: [
            'node_modules/',
            'coverage/',
            '.next/',
            'out/',
            'public/',
            'generated/',
            'fake-data/'
        ]
    },
    js.configs.recommended,
    ...compat.extends(
        'next',
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'prettier'
    ),
    {
        // The `@typescript-eslint` plugin is already registered by the
        // `plugin:@typescript-eslint/recommended` extend above — redeclaring it
        // here would throw "Cannot redefine plugin".
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaFeatures: {
                    jsx: true
                },
                ecmaVersion: 'latest',
                sourceType: 'module'
            }
        },
        rules: {
            // TypeScript resolves globals and imports itself — `no-undef` only
            // produces false positives on types and ambient declarations.
            'no-undef': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
            '@typescript-eslint/no-empty-function': 'off',
            'react-hooks/exhaustive-deps': 'off',
            // `ban-types` was removed in typescript-eslint v8 and split into the
            // three rules below — keep the same opt-out it used to express.
            '@typescript-eslint/no-empty-object-type': 'off',
            '@typescript-eslint/no-unsafe-function-type': 'off',
            '@typescript-eslint/no-wrapper-object-types': 'off',
            'import/no-anonymous-default-export': 'off',
            'no-prototype-builtins': 'off',
            'no-fallthrough': 'off'
        }
    }
];
