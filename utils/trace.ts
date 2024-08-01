/** @module trace A helper for tracing Firebase actions */
import type { DocumentReference, DocumentData, SetOptions, WithFieldValue, PartialWithFieldValue } from "firebase/firestore";
import { setDoc as original } from "firebase/firestore";
export function setDoc<AppModelType, DbModelType extends DocumentData>(reference: DocumentReference<AppModelType, DbModelType>, data: PartialWithFieldValue<AppModelType> | WithFieldValue<AppModelType>, options?: SetOptions) {
    if (import.meta.dev) {
        console.log('Set ', reference.path, ' with data: ', data, ' options ', options)
    }
    return options ? original(reference, data, options) : original(reference, data as WithFieldValue<AppModelType>);
}