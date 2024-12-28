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
        files: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
        languageOptions: {
            ecmaVersion: 2021,
            sourceType: 'module',
            parser: '@typescript-eslint/parser',
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                    tsx: true
                }
            }
        },
        env: {
            browser: true,
            es2021: true
        },
        plugins: {
            '@typescript-eslint': '@typescript-eslint/eslint-plugin',
            react: 'eslint-plugin-react'
        },
        ignores: ['node_modules/', '.next/'],
        rules: {
            'no-fallthrough': 'off',
            'prefer-const': 'off',
            'no-empty-pattern': 'off',
            'jsx-a11y/alt-text': 'off',
            'react-hooks/exhaustive-deps': 'off',
            'import/no-anonymous-default-export': 'off',
            '@typescript-eslint/no-empty-function': 'off',
            '@typescript-eslint/ban-types': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/ban-ts-comment': 'off'
        }
    }
];
