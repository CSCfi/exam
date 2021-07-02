module.exports = {
    extends: [
        'eslint:recommended',
    ],
    env: {
        es2017: true,
        node: true,
        jasmine: true,
        protractor: true
    },
    rules: {
        'max-len': ["error", { "code": 120 }],
        'no-tabs': ["error"]
    }
}