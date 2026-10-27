import { defineStore } from 'pinia'

/**
 * Custom content for a teleported overlay dialog.
 * A plain `string` is used verbatim; the object form adds an optional title and an icon (mdi name).
 */
export type OverlayContent = string | {
    icon?: string
    title?: string
    text: string
}

export const useUI = defineStore('ui', () => {
    const imagesRef = ref<string[] | string>([])
    const visibleRef = ref(false)
    const overlayEnabled = ref(false)
    const overlayContent
        = ref<OverlayContent | null>(null)
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
     * Enable the teleported overlay dialog. Pass custom content to display instead of the default.
     * Paired with the `Overlay` component's `<Teleport>`. Call `clearOverlay()` to turn it off again.
     */
    function showOverlay(content?: OverlayContent) {
        if (content !== undefined) {
            overlayContent.value = content
        }
        overlayEnabled.value = true
    }

    function clearOverlay() {
        overlayEnabled.value = false
        overlayContent.value = null
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

    useRouter().afterEach(() => error)

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
        overlayEnabled,
        overlayText: computed<string>(() => {
            const c = overlayContent.value
            return typeof c === 'string' ? c : ((c && typeof c === 'object') ? c.text ?? '' : '')
        }),
        overlayTitleText: computed<string>(() => {
            const c = overlayContent.value
            return (c && typeof c === 'object') ? c.title ?? '' : ''
        }),
        overlayIconName: computed<string | null>(() => {
            const c = overlayContent.value
            return (c && typeof c === 'object' && c.icon) ? c.icon : null
        }),
        isLoading: computed(() => loadingCount.value > 0),
        showError,
        showLightBox,
        showOverlay,
        clearOverlay,
        showIgnorableError,
        visibleRef,
    }
})
