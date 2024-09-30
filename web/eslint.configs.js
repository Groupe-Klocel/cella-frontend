import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
    baseDirectory: __dirname
});

export default [
    js.configs.recommended,
    ...compat.extends(
        'next',
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'prettier'
    ),
    {
        files: ['**/*.ts', '**/*.tsx'],
        plugins: {
            '@typescript-eslint': '@typescript-eslint/eslint-plugin'
        },
        languageOptions: {
            parser: '@typescript-eslint/parser',
            parserOptions: {
                ecmaFeatures: {
                    jsx: true
                },
                ecmaVersion: 'latest',
                sourceType: 'module'
            }
        },
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
            '@typescript-eslint/no-empty-function': 'off',
            'react-hooks/exhaustive-deps': 'off',
            '@typescript-eslint/ban-types': 'off',
            'import/no-anonymous-default-export': 'off',
            'no-prototype-builtins': 'off',
            'no-fallthrough': 'off'
        }
    }
];
