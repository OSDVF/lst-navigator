import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
    rules: {
        indent: ['error', 4],
        '@typescript-eslint/no-explicit-any': ['off'],
        'comma-dangle': ['error', 'always-multiline'],
        'space-before-function-paren': ['off'],
        'vue/html-indent': ['error', 4],
        '@typescript-eslint/no-unused-vars': ['warn'],
        'no-multiple-empty-lines': ['off'],
        'vue/multiline-html-element-content-newline': ['off'],
        'vue/max-attributes-per-line': ['off'],
    },
})