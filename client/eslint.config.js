import js from '@eslint/js';
import globals from 'globals';

export default [
	{
		ignores: ['dist', 'coverage', 'node_modules']
	},
	{
		files: ['**/*.{js,jsx}'],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'module',
			globals: { ...globals.browser, ...globals.node },
			parserOptions: {
				ecmaFeatures: { jsx: true }
			}
		},
		rules: {
			...js.configs.recommended.rules,
			'no-unused-vars': ['warn', { varsIgnorePattern: '^[A-Z_]' }],
			'no-undef': 'warn'
		}
	}
];
