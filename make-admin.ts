/**
 * Uses firebase admin api to set a specific user to super admin. Works both with emulator and with production data
 */
import { FieldPath, getFirestore } from 'firebase-admin/firestore'
import useFirebase from '~/server/utils/firebase'
import type { UserInfo } from './types/cloud'

const user = process.argv[2]

useFirebase({
    nuxt: {
        options: {
            vuefire: {
                config: {
                    apiKey: process.env.VITE_APP_APIKEY,
                    authDomain: process.env.VITE_APP_AUTHDOMAIN,
                    projectId: process.env.VITE_APP_PROJECTID,
                    storageBucket: process.env.VITE_APP_STORAGEBUCKET,
                    appId: process.env.VITE_APP_APPID,
                    measurementId: process.env.VITE_APP_MEASUREMENTID,
                },
            },
        },
    } as any,
})

const fs = getFirestore()
const userDocs = await fs.collection('users' as KnownCollectionName).where('email', '==', user).get()
if (userDocs.empty) {
    console.info('No user with that email found')
    process.exit(2)
}
if (userDocs.docs.length > 1 && !process.argv[3]) {
    console.log('There are ' + userDocs.docs.length + ' users with this email', userDocs.docs, 'Specify the index with another CLI argument')
    process.exit(1)
}

const doc = userDocs.docs[parseInt(process.argv[3]) || 0]
const data = doc.data() as UserInfo
console.trace(data)
if (data.permissions.superAdmin) {
    console.log('This user is already a super admin')
} else {
    await doc.ref.update(new FieldPath('permissions', 'superAdmin'), true)
}
