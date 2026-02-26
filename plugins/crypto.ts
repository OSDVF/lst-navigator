export default defineNuxtPlugin(async () => {
    if (import.meta.server && typeof globalThis.crypto === 'undefined') {
        const { Crypto } = await import('@peculiar/webcrypto')
        globalThis.crypto = new Crypto()
    }
})
