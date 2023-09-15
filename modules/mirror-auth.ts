import path from 'path'
import fs from 'fs'
import { defineNuxtModule } from '@nuxt/kit'

const files = [
    'handler',
    'handler.js',
    'experiments.js',
    'iframe',
    'iframe.js'
]

export default defineNuxtModule({
    meta: {
        name: 'mirror-auth',
        compatibility: {
            nuxt: '>=2.15'
        }
    },
    hooks: {
        ready(nuxt) {
            console.log('Mirroring auth files...')
            for (const file of files) {
                fetch(`https://${(nuxt.options as any).vuefire?.config?.projectId}.firebaseapp.com/__/auth/${file}`, {
                    signal: AbortSignal.timeout(60000)// one minute timeout
                }).then((response) => {
                    return response.text()
                }).then((content) => {
                    console.log(`Fetched ${file}`)
                    fs.writeFileSync(path.resolve(__dirname, '../public/__/auth', file), content, { encoding: 'utf8', flag: 'w' })
                })
            }
        }
    }
})
