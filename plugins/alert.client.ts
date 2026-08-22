export default defineNuxtPlugin({
    setup(app) {
        app.provide('alert', function alert(message?: string) {
            if (message) {
                window.alert(message)
            }
        })
        app.provide('confirm', function confirm(message?: string) {
            return window.confirm(message)
        })
    },
})
