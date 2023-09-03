export default defineNitroPlugin((nitro) => {
    nitro.hooks.hookOnce('error', (error, { event }) => {
        console.error(`${event.path} Application error:`, error)
    })
})
