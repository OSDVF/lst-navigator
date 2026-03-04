import { getApp, initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getInternalSettings } from './settings'

let appInitialized = false
function getOrInitFirebase() {
    const appSettings = getInternalSettings()

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