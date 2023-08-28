export default defineNuxtPlugin((nuxtApp) => {
    nuxtApp.vueApp.directive('paste-model', {
        mounted(el, _binding, vnode) {
            el.addEventListener('paste', (e: ClipboardEvent) => {
                const value = e.clipboardData?.getData('text/plain')
                if (typeof value !== 'string') { return }
                vnode.component?.emit('update:modelValue', value)
            })
        }
    })
})
