import { defineStore } from 'pinia'

export const useUI = defineStore('ui', () => {
    const imagesRef = ref<string[] | string>([])
    const visibleRef = ref(false)
    const _loading = ref(0)
    const loadingCount = computed({
        get() {
            return _loading.value
        },
        set(val: number) {
            _loading.value = Math.max(0, val)
        },
    })
    function loading(): Disposable {
        loadingCount.value++
        return {
            [Symbol.dispose]() {
                loadingCount.value--
            },
        }
    }

    function showLightBox(images: string[] | string) {
        imagesRef.value = images
        visibleRef.value = true
    }

    return {
        startLoading: () => loadingCount.value++,
        stopLoading: () => loadingCount.value--,
        loading,
        loadingCount,
        imagesRef,
        isLoading: computed(() => loadingCount.value > 0),
        showLightBox,
        visibleRef,
    }
})
