import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'

export default [
  // Ignore build output and dependencies
  {
    ignores: ['dist/', 'node_modules/', 'coverage/'],
  },
  // Base recommended rules for all JS/JSX files
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-unused-vars': 'off',
      'no-constant-binary-expression': 'warn',
    },
  },
  // Node.js config files (webpack, tailwind, etc.)
  {
    files: ['webpack.config.js', 'tailwind.config.js', 'postcss.config.js', 'jest.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  // Test files
  {
    files: ['**/*.test.{js,jsx}', '**/*.spec.{js,jsx}', 'src/test/**'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
]
