/** @module trace A helper for tracing Firebase actions */
import type { DocumentReference, DocumentData, SetOptions, WithFieldValue, PartialWithFieldValue, CollectionReference } from 'firebase/firestore';
import { setDoc as originalSD, addDoc as originalAD, deleteDoc as originalDel } from 'firebase/firestore';
export function setDoc<AppModelType, DbModelType extends DocumentData>(reference: DocumentReference<AppModelType, DbModelType>, data: PartialWithFieldValue<AppModelType> | WithFieldValue<AppModelType>, options?: SetOptions) {
    if (import.meta.dev) {
        console.log('Set ', reference.path, ' with data: ', data, ' options ', options)
    }
    return options ? originalSD(reference, data, options) : originalSD(reference, data as WithFieldValue<AppModelType>);
}

export function addDoc<AppModelType, DbModelType extends DocumentData>(reference: CollectionReference<AppModelType, DbModelType>, data: WithFieldValue<AppModelType>): Promise<DocumentReference<AppModelType, DbModelType>> {
    if (import.meta.dev) {
        console.log('Add ', reference.path, ' with data: ', data)
    }
    return originalAD(reference, data);
}

export function deleteDoc<AppModelType, DbModelType extends DocumentData>(reference: DocumentReference<AppModelType, DbModelType>): Promise<void> {
    if (import.meta.dev) {
        console.log('Delete ', reference.path)
    }
    return originalDel(reference);
}