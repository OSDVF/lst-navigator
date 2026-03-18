import type { FirestoreGoogleAppsScript } from "firestore_google-apps-script";

declare global {
    const FirestoreApp: FirestoreGoogleAppsScript.FirestoreApp; // globally available
}