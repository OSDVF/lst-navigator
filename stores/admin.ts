import { defineStore } from 'pinia'

export type DisplayKind = 'histogram' | 'individual'

export const useAdmin = defineStore('admin', function () {
    const displayKind = usePersistentRef<DisplayKind>('displayKind', 'histogram')
    const editingFeedback = usePersistentRef('editingFeedback', false)

    return {
        displayKind,
        editingFeedback: computed({
            get: () => editingFeedback.value && displayKind.value === 'individual',
            set: (value: boolean) => { editingFeedback.value = value }
        })
    }
})
