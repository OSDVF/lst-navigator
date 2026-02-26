export default defineNuxtPlugin({
    setup(app) {
        app.provide('alert', function alert(message?: string) {
            console.trace(message)
        })
    },
})