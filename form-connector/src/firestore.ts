
import type Firestore from 'firestore_google-apps-script/Firestore'
import { getSecrets, type ApplicationFormSecrets } from './settings'

let fs : undefined | Firestore
export function useFirestore(id: string, settings?: ApplicationFormSecrets) {
    const appSettings = settings ?? getSecrets(id)

    if(!appSettings.email) {
        throw new Error("Email not set in settings")
    }
    if(!appSettings.key) {
        throw new Error("Key not set in settings")
    }
    if(!appSettings.projectId) {
        throw new Error("Project ID not set in settings")
    }

    if (!fs) {
        fs = FirestoreApp.getFirestore(appSettings.email,appSettings.key, appSettings.projectId)
    }
    return fs
}