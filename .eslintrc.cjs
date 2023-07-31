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
        'space-before-function-paren': ['off'],
        'vue/html-indent': ['error', 4],
        '@typescript-eslint/no-unused-vars': ['warn'],
        'no-multiple-empty-lines': ['off'],
        'vue/multiline-html-element-content-newline': ['off'],
        'vue/max-attributes-per-line': ['off']
    }
}
