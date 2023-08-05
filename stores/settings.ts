import localforage from 'localforage'
import { defineStore } from 'pinia'

export const useSettings = defineStore('settings', () => {
    function getInstallStep() {
        return localforage.getItem<number>('installStep')
    }

    function setInstallStep(newValue: number) {
        localforage.setItem('installStep', newValue)
    }

    return {
        getInstallStep,
        setInstallStep
    }
})
