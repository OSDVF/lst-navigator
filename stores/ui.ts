import { defineStore } from 'pinia'

export const useUI = defineStore('ui', () => {
    const imagesRef = ref<string[] | string>([])
    const visibleRef = ref(false)
    const loading = ref(0)

    function showLightBox(images: string[] | string) {
        imagesRef.value = images
        visibleRef.value = true
    }

    return {
        startLoading: () => loading.value++,
        stopLoading: () => loading.value--,
        isLoading: computed(() => loading.value > 0),
        showLightBox,
        imagesRef,
        visibleRef,
    }
})
