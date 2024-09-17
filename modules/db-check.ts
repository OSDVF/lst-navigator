/**
 * Check the database schema for consistency
 */

 
import { defineNuxtModule } from '@nuxt/kit'
import type { CollectionReference} from 'firebase-admin/firestore'
import { DocumentReference, getFirestore } from 'firebase-admin/firestore'
import { CollectionsList, type KnownCollectionName } from '../utils/db'
import useFirebase from '../server/utils/firebase'
import { type EventDescription, EventSubcollectionsList } from '../types/cloud'
import onlyBuildTasks from '../utils/onlyBuildTasks'

export default defineNuxtModule({
    meta: {
        name: 'db-check',
    },
    hooks: {
        async ready(nuxt) {
            if (!onlyBuildTasks()) { return }

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
            for (const evtDoc of events) {
                const event = (await evtDoc.get()).data() as EventDescription<CollectionReference>
                ///
                /// Check references
                ///
                for (const ref of EventSubcollectionsList) {
                    if (!event[ref] || !(await event[ref].get())) {
                        console.warn(`Event '${evtDoc.id}' subcollection reference '${ref}': '${event[ref] instanceof DocumentReference ? event[ref]?.path : event[ref]}' is not valid`)
                    }
                }
            }

            fs.terminate()
        },
    },
})
