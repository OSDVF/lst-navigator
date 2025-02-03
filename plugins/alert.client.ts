export default defineNuxtPlugin({
    setup(app) {
        app.provide('alert', function alert(message?: string) {
            if (message) {
                window.alert(message)
            }
        })
    },
})