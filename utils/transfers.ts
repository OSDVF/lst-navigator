import { doc } from 'firebase/firestore'
import {useCollection as useCollectionT} from './trace'
import type { Transfer } from '~/types/cloud'

export function useTransfers() {
    return useCollectionT<Transfer>(knownCollection(useFirestore(), 'transfers'))
}

export function transfersDoc(id: string) {
    return doc(knownCollection(useFirestore(), 'transfers'), id)
}