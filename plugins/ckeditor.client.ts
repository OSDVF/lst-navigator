export default defineNuxtPlugin({
    parallel: true,
    async setup(nuxtApp) {
        const plugin = await import('@ckeditor/ckeditor5-vue')
        nuxtApp.vueApp.use(plugin.default)
    },
})
