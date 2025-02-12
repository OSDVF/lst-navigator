import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
    rules: {
        semi: ['error', 'never'],
        indent: ['error', 4],
        curly: ['error', 'all'],
        '@typescript-eslint/no-explicit-any': ['off'],
        '@typescript-eslint/no-unused-vars': ['warn'],
        'comma-dangle': ['error', 'always-multiline'],
        'space-before-function-paren': ['off'],
        'no-multiple-empty-lines': ['off'],
        quotes: ['error', 'single'],
        'quote-props': ['warn', 'as-needed'],
        'vue/html-indent': ['error', 4],
        'vue/multiline-html-element-content-newline': ['off'],
        'vue/max-attributes-per-line': ['off'],
    },
    ignores: ['swenv.js'],
})