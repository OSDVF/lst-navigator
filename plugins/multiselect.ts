import Multiselect from 'vue-multiselect'
import 'vue-multiselect/dist/vue-multiselect.css'

export default defineNuxtPlugin({
    parallel: true,
    setup(nuxtApp) {
        nuxtApp.vueApp.component('Multiselect', Multiselect)
    },
})
