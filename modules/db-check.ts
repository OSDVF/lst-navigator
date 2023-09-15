/**
 * Check the database schema for consistency
 */

/* eslint-disable no-console */
import { defineNuxtModule } from '@nuxt/kit'
import { DocumentReference, getFirestore } from 'firebase-admin/firestore'
import { CollectionsList, KnownCollectionName } from '../utils/db'
import useFirebase from '../server/utils/firebase'
import { EventDescription, EventSubdocumentsList } from '../types/cloud'

export default defineNuxtModule({
    meta: {
        name: 'db-check',
        compatibility: {
            nuxt: '>=3.0'
        }
    },
    hooks: {
        async ready(nuxt) {
            try {
                // if the internet is not accessible, do not even try to check the db
                await fetch('https://firestore.googleapis.com/', { signal: AbortSignal.timeout(5000) })
            } catch (e) {
                return
            }
            console.log('Checking database schema...')

            useFirebase({ nuxt })
            const fs = getFirestore()// firebase should be initialized using plugins/1.firebase.ts
            const existingCollections = await fs.listCollections()
            const names = existingCollections.map(ec => ec.id)

            if (!CollectionsList.every(c => names.includes(c))) {
                console.warn('Some of required collections ', existingCollections, ' does not exist.\n',
                    'Existing collections: ', names)
            }


            function knownCollection(name: KnownCollectionName) {
                return fs.collection(name)
            }

            const events = await knownCollection('events').listDocuments()
            for (const doc of events) {
                const event = (await doc.get()).data() as EventDescription<DocumentReference>
                for (const ref of EventSubdocumentsList) {
                    if (!event[ref] || !(await event[ref].get()).exists) {
                        console.warn(`Event '${doc.id}' subdocument reference '${ref}': '${event[ref] instanceof DocumentReference ? event[ref]?.path : event[ref]}' is not valid`)
                    }
                }
            }
            fs.terminate()
        }
    }
})
