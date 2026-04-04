import type { App } from 'vue'
import $ from 'jquery'

async function append(app: App) {
    await addScript('https://cdn.datatables.net/v/dt/moment-2.29.4/dt-2.3.7/b-3.2.6/b-colvis-3.2.6/b-print-3.2.6/cr-2.1.2/cc-1.2.1/date-1.6.3/kt-2.12.2/r-3.0.8/sc-2.4.3/sl-3.1.3/sr-1.4.3/datatables.min.js', app, 'sha384-KGqfNE/YywE6y21VGUce9FAQ7jQZM0Xannuw1XAOAjMEX3/bNrIxcHyGdQ2VDOi3')
    await addStyle('https://cdn.datatables.net/v/dt/moment-2.29.4/dt-2.3.7/b-3.2.6/b-colvis-3.2.6/b-print-3.2.6/cr-2.1.2/cc-1.2.1/date-1.6.3/kt-2.12.2/r-3.0.8/sc-2.4.3/sl-3.1.3/sr-1.4.3/datatables.min.css', app, 'sha384-Vyh/I7S7GALPzQFQB1RiKVXDmyHvSUT3I0ZFD54kPt0ZjPtglSAdXWsXhsjWjaku')
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
                        const cc = (<any>DataTable.ColumnControl)
                        cc.content.showAll = {
                            defaults: {
                                text: 'Zobrazit všechny',
                                icon: 'orderRemove',
                            },
                            init: function (config: any) {
                                const dt = this.dt()
                                const btn = new cc.Button(dt, this)
                                    .text(config.text)
                                    .icon(config.icon)
                                    .handler(function () {
                                        dt.columns().visible(true)
                                    })
                                return btn.element()
                            },
                        }

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