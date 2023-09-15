export default defineNitroPlugin((nitro) => {
    nitro.hooks.hookOnce('error' as any, (error: any, { event }: any) => {
        console.error(`${event} Nitro error:`, error)
    })
})
