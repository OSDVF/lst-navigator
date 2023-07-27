// .eslintrc.cjs

module.exports = {
    root: true,
    env: {
        browser: true,
        node: true
    },
    parser: 'vue-eslint-parser',
    parserOptions: {
        parser: '@typescript-eslint/parser'
    },
    extends: ['@nuxtjs/eslint-config-typescript'],
    plugins: [],
    rules: {
        indent: ['error', 4],
        'comma-dangle': ['error', 'never'],
        'space-before-function-paren': ['error', 'never'],
        'vue/html-indent': ['error', 4]
    }
}
