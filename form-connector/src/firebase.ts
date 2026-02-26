import { getApp, initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAppSettings } from './settings'

let appInitialized = false
function getOrInitFirebase() {
    const appSettings = getAppSettings()

    if (!appInitialized) {
        const app = initializeApp(appSettings)
        appInitialized = true
        return app
    } else {
        return getApp()
    }
}

export function useFirestore() {
    getOrInitFirebase()
    return getFirestore()
}