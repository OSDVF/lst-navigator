import { getFirestore } from 'firebase-admin/firestore'
import { CollectionsList } from '@/utils/db'
import useFirebase from '@/server/utils/firebase'


export default defineNitroPlugin(async () => {
    useFirebase()
    const fs = getFirestore()// firebase should be initialized using plugins/1.firebase.ts
    const existingCollections = await fs.listCollections()
    const names = existingCollections.map(ec => ec.id)

    if (!CollectionsList.every(c => names.includes(c))) {
        console.warn('Some of required collections ', existingCollections, ' does not exist.\n',
            'Existing collections: ', names)
    }
})
