import { defineStore } from 'pinia'
import { collection, doc } from 'firebase/firestore'
import { useFirebaseStorage } from 'vuefire'

export const useCloudStore = defineStore('cloud', () => {
    const firestore = useFirestore()
    const firebaseStorage = useFirebaseStorage()
    const config = useRuntimeConfig()

    const eventDbName = ref(config.public.dbCollectionName)

    function getDocument(docName: string) {
        if (typeof eventDbName.value === 'undefined') {
            return null
        }
        return doc(collection(firestore, eventDbName.value), docName)
    }
    const metaDocument = computed(() => getDocument('meta'))

    return { eventDbName, getDocument, metaDocument, firebaseStorage }
})
