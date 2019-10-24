module.exports = {
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: './tsconfig.json',
        ecmaVersion: 2018,
        sourceType: 'module',
        createDefaultProgram: true, // https://github.com/typescript-eslint/typescript-eslint/issues/864
    },
    plugins: ['@typescript-eslint'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:angular/johnpapa/',
        'prettier/@typescript-eslint', // Uses eslint-config-prettier to disable ESLint rules from @typescript-eslint/eslint-plugin that would conflict with prettier
        'plugin:prettier/recommended',
    ],
    env: {
        browser: true,
        node: true,
    },
    rules: {
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        'angular/file-name': 'off',
        'angular/no-service-method': 'off',
        'angular/service-name': 'off',
        'no-redeclare': 'error',
        'no-eval': 'error',
        'no-caller': 'error',
        'no-bitwise': 'error',
        'no-new': 'error',
        'no-var': 'error',
    },
};
