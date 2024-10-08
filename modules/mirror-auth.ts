import { defineNuxtModule } from '@nuxt/kit'
import onlyBuildTasks from '../utils/onlyBuildTasks'
import mirrorAuth from '../utils/mirrorAuth'

export default defineNuxtModule({
    meta: {
        name: 'mirror-auth',
    },
    hooks: {
        ready(nuxt) {
            // eslint-disable-next-line nuxt/prefer-import-meta
            if (!onlyBuildTasks() && !process.prerender) { return }

            console.log('Mirroring auth files...')
            mirrorAuth(`${(nuxt.options as any).vuefire?.config?.projectId}.firebaseapp.com`)
        },
    },
})
