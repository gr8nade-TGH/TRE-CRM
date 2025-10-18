import js from '@eslint/js';
import globals from 'globals';

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.es2021,
            }
        },
        rules: {
            // Warn about unused variables (helps catch bugs)
            'no-unused-vars': ['warn', { 
                'argsIgnorePattern': '^_',
                'varsIgnorePattern': '^_'
            }],
            
            // Warn about console.log (you can remove in production)
            'no-console': 'off', // Keep it off for now since you use console.log for debugging
            
            // Catch common errors
            'no-undef': 'error',
            'no-unreachable': 'warn',
            'no-constant-condition': 'warn',
            
            // Best practices
            'eqeqeq': ['warn', 'always'], // Use === instead of ==
            'no-var': 'warn', // Use let/const instead of var
            'prefer-const': 'warn', // Use const when variable isn't reassigned
        }
    },
    {
        // Ignore patterns
        ignores: [
            'node_modules/**',
            'checkpoints/**',
            'logs/**',
            'dist/**',
            'build/**'
        ]
    }
];

