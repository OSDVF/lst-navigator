/** @module trace A helper for tracing Firebase actions */
import { CollectionReference, DocumentReference, type DocumentData, type SetOptions, type WithFieldValue, type PartialWithFieldValue, type Query, getDocFromCache, getDocsFromCache, type QuerySnapshot } from 'firebase/firestore'
import { setDoc as originalSD, addDoc as originalAD, deleteDoc as originalDel, getDoc as originalGet, getDocs as getDocsOriginal } from 'firebase/firestore'
import { useDocument as originalUseDoc, useCollection as originalUseCol, type _RefFirestore, type UseCollectionOptions, type UseDocumentOptions, type VueFirestoreQueryData, type VueFirestoreDocumentData } from 'vuefire'

function log() {
    const c = useRuntimeConfig()
    return c.public.logWrites
}

export function setDoc<AppModelType, DbModelType extends DocumentData>(reference: DocumentReference<AppModelType, DbModelType>, data: PartialWithFieldValue<AppModelType> | WithFieldValue<AppModelType>, options?: SetOptions) {
    if (log()) {
        console.log('Set ', reference.path, ' with data: ', data, ' options ', options)
    }
    return options ? originalSD(reference, data, options) : originalSD(reference, data as WithFieldValue<AppModelType>)
}

export function addDoc<AppModelType, DbModelType extends DocumentData>(reference: CollectionReference<AppModelType, DbModelType>, data: WithFieldValue<AppModelType>): Promise<DocumentReference<AppModelType, DbModelType>> {
    if (log()) {
        console.log('Add ', reference.path, ' with data: ', data)
    }
    return originalAD(reference, data)
}

export function deleteDoc<AppModelType, DbModelType extends DocumentData>(reference: DocumentReference<AppModelType, DbModelType>): Promise<void> {
    if (log()) {
        console.log('Delete ', reference.path)
    }
    return originalDel(reference)
}

/**
 * EXPERIMENTAL: Cache-first
 */
export function getDocCacheOr<AppModelType, DbModelType extends DocumentData>(reference: DocumentReference<AppModelType, DbModelType>) {
    if (log()) {
        console.log('Get ', reference.path)
    }
    return getDocFromCache(reference).catch(() => originalGet(reference))
}

export function getDocs<AppModelType, DbModelType extends DocumentData>(query: Query<AppModelType, DbModelType>): Promise<QuerySnapshot<AppModelType, DbModelType>> {
    if (log()) {
        console.log('Get', query)
    }
    return getDocsFromCache(query).catch(() => getDocsOriginal(query))
}

type _InferReferenceType<R> = R extends CollectionReference<infer T> | Query<infer T> | DocumentReference<infer T> ? T : R;
export function useDocument<T>(documentRef: MaybeRefOrGetter<DocumentReference | null | undefined>, options?: UseDocumentOptions<T>): _RefFirestore<VueFirestoreDocumentData<T> | undefined>;
export function useDocument<R extends DocumentReference<unknown>>(documentRef: MaybeRefOrGetter<R | null | undefined>, options?: UseDocumentOptions<_InferReferenceType<R>>): _RefFirestore<_InferReferenceType<R> | undefined>;
export function useDocument<T>(documentRef: MaybeRefOrGetter<DocumentReference | null | undefined>, options?: UseDocumentOptions<T>) {
    if (log()) {
        const v = toValue(documentRef)
        console.log('Use ', v instanceof DocumentReference ? v.path : v)
    }
    return originalUseDoc(documentRef, options)
}

export function useCollection<T>(collectionRef: MaybeRefOrGetter<CollectionReference<unknown> | Query<unknown> | null | undefined>, options?: UseCollectionOptions<T[]>): _RefFirestore<VueFirestoreQueryData<T>>;
export function useCollection<R extends CollectionReference<unknown> | Query<unknown>>(collectionRef: MaybeRefOrGetter<R | null | undefined>, options?: UseCollectionOptions<_InferReferenceType<R>[]>): _RefFirestore<_InferReferenceType<R>[]>;
export function useCollection<T>(collectionRef: MaybeRefOrGetter<CollectionReference<unknown> | Query<unknown> | null | undefined>, options?: UseCollectionOptions<T[]>) {
    if (log()) {
        const v = toValue(collectionRef)
        console.log('UseCollection', v instanceof CollectionReference ? v.path : v)
    }
    return originalUseCol(collectionRef, options)
}