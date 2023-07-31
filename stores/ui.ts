import { defineStore } from 'pinia'

export const useUI = defineStore('ui', () => {
    const imagesRef = ref<string[] | string>([])
    const visibleRef = ref(false)

    function showLightBox(images: string[] | string) {
        imagesRef.value = images
        visibleRef.value = true
    }

    return {
        showLightBox,
        imagesRef,
        visibleRef
    }
})
