import type { App } from 'vue'
import $ from 'jquery'

async function append(app: App) {
    await addScript('https://cdn.datatables.net/v/dt/dt-2.3.7/b-3.2.6/b-print-3.2.6/cr-2.1.2/cc-1.2.1/date-1.6.3/kt-2.12.2/r-3.0.8/sc-2.4.3/sl-3.1.3/sr-1.4.3/datatables.min.js', app, 'sha384-ed/LaayRS6Lvyk0hUnrWjNnm4MWJ4x9Y9mwTtooJ/jDG7X+u7oTYrC0Wad2GOkKv')
    await addStyle('https://cdn.datatables.net/v/dt/dt-2.3.7/b-3.2.6/b-print-3.2.6/cr-2.1.2/cc-1.2.1/date-1.6.3/kt-2.12.2/r-3.0.8/sc-2.4.3/sl-3.1.3/sr-1.4.3/datatables.min.css', app, 'sha384-Nq6NX05Z+tBT43ZJmT80lANQf6SMKdLSOh4ksPKE2W4HwVIsY3TFwOr/mYJ5rMXn')
    await addScript('https://cdn.datatables.net/plug-ins/2.3.7/dataRender/ellipsis.js', app)
}

async function addStyle(url: string, app: App, integrity?: string) {
    const style = document.createElement('link')
    style.rel = 'stylesheet'
    style.href = url
    if (integrity) { style.integrity = integrity }
    style.crossOrigin = 'anonymous'
    await new Promise(resolve => {
        style.onload = resolve
        app._container?.appendChild(style)
    })
}

async function addScript(url: string, app: App, integrity?: string) {
    const script = document.createElement('script')
    if (integrity) { script.integrity = integrity }
    script.crossOrigin = 'anonymous'
    script.src = url
    await new Promise(resolve => {
        script.onload = resolve
        app._container?.appendChild(script)
    })
}

export default defineNuxtPlugin(nuxt => {
    const loaded = shallowRef(false)
    let loading: Promise<void> | false = false
    return {
        provide: {
            loadDataTables: async () => {
                if (loaded.value) {
                    return DataTable
                }
                if (!loading) {
                    loading = (async () => {
                        window.jQuery = $
                        window.$ = $
                        await append(nuxt.vueApp)
                        loaded.value = true
                    })()
                }
                await loading
                return DataTable
            },
            DataTable: computed(() => loaded.value ? DataTable : undefined),
        },
    }
})