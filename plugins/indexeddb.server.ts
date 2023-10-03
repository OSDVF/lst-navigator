import indexeddb from 'fake-indexeddb'

globalThis.indexedDB = indexeddb

export default defineNuxtPlugin({
    enforce: 'pre',
    name: 'indexeddb'
})
