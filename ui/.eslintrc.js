module.exports = {
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: './tsconfig.json',
        ecmaVersion: 2021,
        sourceType: 'module',
        createDefaultProgram: true, // https://github.com/typescript-eslint/typescript-eslint/issues/864
    },
    plugins: ['@typescript-eslint', 'import'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
        'prettier', // Disables ESLint rules from @typescript-eslint/eslint-plugin that would conflict with prettier
        'plugin:prettier/recommended',
    ],
    env: {
        browser: true,
        node: true,
    },
    rules: {
        //'@typescript-eslint/consistent-type-imports': 1,
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        'no-redeclare': 'error',
        'no-eval': 'error',
        'no-caller': 'error',
        'no-bitwise': 'error',
        'no-new': 'error',
        'no-var': 'error',
    },
};
