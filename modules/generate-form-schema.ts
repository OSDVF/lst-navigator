import { addTemplate, defineNuxtModule } from '@nuxt/kit'
import tsj from 'ts-json-schema-generator'

export default defineNuxtModule({
    meta: {
        name: 'generate-form-schema',
    },
    async setup() {
        try {
            console.log('Generationg JSON schema from application form defined types...')
            const schema = JSON.stringify(tsj.createGenerator({
                path: './form-connector/src/types.ts',
                type: '*',
            }).createSchema(), null, 2)
            addTemplate({
                filename: 'forms/schema.json',
                getContents: () => schema,
            })
        } catch (e) {
            if (e instanceof tsj.BuildError) { console.error('Error creating schema:', e.format()) }
            else {
                console.error('Error creating schema:', e)
            }
        }
    },
})
