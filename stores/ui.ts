import { defineStore } from 'pinia'

export const useUI = defineStore('ui', () => {
    const imagesRef = ref<string[] | string>([])
    const visibleRef = ref(false)
    const error = ref()
    const ignorable = ref(false)
    const _defaultIgnoreText = 'Přesto pokračovat'
    const ignoreText = ref(_defaultIgnoreText)
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

    /**
     * Pair with CustomError component
     * @param e The error
     * @returns A Promise that resolves when the error is ignored and reject when it is just cleared
     */
    function showIgnorableError(e: any, text?: string) {
        error.value = e
        ignorable.value = true
        if (text) {
            ignoreText.value = text
        }
        return new Promise<void>((res, rej) => watchOnce(error, () => {
            if (ignorable.value) {
                res()
            } else {
                rej()
            }
        })).finally(clearError)
    }

    function showError(e: any) {
        error.value = e
    }

    function clearError() {
        ignorable.value = false//the order matters because showIgnorableError checks for ignorable when error.value changes
        error.value = undefined
        ignoreText.value = _defaultIgnoreText
    }

    useRouter().afterEach(()=>error)

    return {
        clearError,
        ignoreText: computed(() => ignoreText.value),//readonly
        ignorable: computed(() => ignorable.value),//readonly
        error: computed(() => error.value),//readonly
        ignoreError: () => (error.value = undefined),
        startLoading: () => loadingCount.value++,
        stopLoading: () => loadingCount.value--,
        loading,
        loadingCount,
        imagesRef,
        isLoading: computed(() => loadingCount.value > 0),
        showError,
        showLightBox,
        showIgnorableError,
        visibleRef,
    }
})
