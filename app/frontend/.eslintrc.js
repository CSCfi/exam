module.exports = {
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: './tsconfig.json'
    },
    plugins: ['@typescript-eslint'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:angular/johnpapa'
    ],
    env: {
        'browser': true,
        'node': true
    },
    rules: {
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        'angular/file-name': 'off',
        'angular/no-service-method': 'off',
        'max-len': ["error", { "code": 120 }],
        'no-tabs': ["error"]
    }
}