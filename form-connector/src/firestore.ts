
import type Firestore from 'firestore_google-apps-script/Firestore'
import { getSecrets, type RegistrationFormSecrets } from './settings'
import { SecretsError } from './errors'

let fs : undefined | Firestore
export function useFirestore(formId: string, settings?: RegistrationFormSecrets) {
    const appSettings = settings ?? getSecrets(formId)

    if(!appSettings.email) {
        throw new SecretsError("Email not set in settings")
    }
    if(!appSettings.key) {
        throw new SecretsError("Key not set in settings")
    }
    if(!appSettings.projectId) {
        throw new SecretsError("Project ID not set in settings")
    }

    if (!fs) {
        fs = FirestoreApp.getFirestore(appSettings.email,appSettings.key, appSettings.projectId)
    }
    return fs
}
