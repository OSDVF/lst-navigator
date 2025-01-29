export default defineNuxtPlugin({
    parallel: true,
    name: 'no-overflow',
    setup(nuxtApp) {
        let observer: ResizeObserver
        const maxWidth = new Map<HTMLElement, number>()
        if (import.meta.browser) {
            observer = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    const el = entry.target as HTMLElement
                    const orig = maxWidth.get(el)
                    if (typeof orig === 'number') {
                        if (el.clientWidth > orig) {
                            el.style.maxWidth = orig! + 'px'
                        }
                    } else {// a parent element
                        for (let i = 0; i < entry.target.children.length; i++) {
                            const ch = entry.target.children[i] as HTMLElement
                            if (maxWidth.has(ch)) {
                                maxWidth.set(ch, el.clientWidth)
                                ch.style.maxWidth = el.clientWidth + 'px'
                            }
                        }
                    }
                }
            })
        }

        nuxtApp.vueApp.directive('no-overflow', {
            mounted(el) {
                if (el.parentElement) {
                    maxWidth.set(el, el.parentElement.clientWidth)
                    observer.observe(el)
                    observer.observe(el.parentElement)
                } else {
                    console.error('no-overflow directive must be used on an element with a parent')
                }
            },
            beforeUnmount(el) {
                if (el.parentElement) {
                    observer.unobserve(el.parentElement!)
                    observer.unobserve(el)
                    maxWidth.delete(el)
                }
            },
        })
    },
})
