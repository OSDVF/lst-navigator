import { defineStore } from 'pinia'
import { unzip } from 'unzipit'
import { usePersistentRef } from '@/utils/storage'
import lf from '~/utils/lf'

let uniqueIdentifier = new Date().getTime().toString(36)
try {
    const prevIdentifier = localStorage.getItem('uniqueIdentifier')
    if (!prevIdentifier) {
        localStorage.setItem('uniqueIdentifier', uniqueIdentifier)
    } else {
        uniqueIdentifier = prevIdentifier
    }
} catch (e) { }

/* async function getUncompressedSilenceFile() {
    const compressed = '/audio/silence.zip'
    const { entries } = await unzip(compressed)
    const file = Object.entries(entries).find(([key]) => key.endsWith('.mp3'))
    const arrayBuffer = await file?.[1].arrayBuffer()
    if (!arrayBuffer) { throw new Error('Could not load silence file') }
    return URL.createObjectURL(new Blob([arrayBuffer], { type: 'audio/mpeg' }))
} */

export const useSettings = defineStore('settings', () => {
    function getInstallStep() {
        return lf.getItem<number>('installStep')
    }

    function setInstallStep(newValue: number) {
        lf.setItem('installStep', newValue)
    }

    async function getUploadedAudio() {
        const audioList: { name: string, url: string }[] = []
        const list = await lf.getItem<string[]>('uploadedAudioList') || []
        for (const item of list) {
            const blob = await lf.getItem<Blob>(item)
            if (blob) {
                const url = URL.createObjectURL(blob)
                audioList.push({ name: item, url })
            }
        }
        return audioList
    }

    const defaultAudioList = [
        { name: 'Hadovky', url: '/audio/hadovky.mp3' },
        { name: 'Líbezný zpěv', url: '/audio/zpev.mp3' }
    ]
    const audioList = ref(defaultAudioList)
    getUploadedAudio().then((uploadedAudioList) => {
        audioList.value = defaultAudioList.concat(uploadedAudioList)
    })

    const selectedAudio = usePersistentRef<number | string>('selectedAudio', 0)
    const selectedAudioName = computed({
        get() {
            if (typeof selectedAudio.value === 'number') { return audioList.value[selectedAudio.value]?.name }
            return selectedAudio.value
        },
        set(newValue: string) {
            const index = audioList.value.findIndex(item => item.name === newValue)
            if (index !== -1) {
                selectedAudio.value = index
            } else {
                selectedAudio.value = newValue
            }
        }
    })
    const selectedAudioUrl = computed(() => {
        if (typeof selectedAudio.value === 'number') { return audioList.value[selectedAudio.value]?.url }
        return selectedAudio.value
    })
    const isSelectedAudioCustom = computed(() => {
        if (typeof selectedAudio.value === 'number' && selectedAudio.value < defaultAudioList.length) { return false }
        return true
    })

    function uploadCustomAudio(file: File) {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = async () => {
            const blob = new Blob([reader.result as ArrayBuffer], { type: file.type })
            const niceName = file.name.replace(/\.[^/.]+$/, '')
            await lf.setItem(niceName, blob)
            const list = await lf.getItem<string[]>('uploadedAudioList') || []
            list.push(niceName)
            await lf.setItem('uploadedAudioList', list)
            audioList.value.push({ name: niceName, url: URL.createObjectURL(blob) })
            selectedAudio.value = audioList.value.length - 1
        }
    }

    async function deleteCustomAudio(name: string) {
        lf.removeItem(name)
        const list = await lf.getItem<string[]>('uploadedAudioList') || []
        const index = list.findIndex(item => item === name)
        if (index !== -1) {
            list.splice(index, 1)
            lf.setItem('uploadedAudioList', list)
        }
        const audioIndex = audioList.value.findIndex(item => item.name === name)
        if (audioIndex !== -1) {
            audioList.value.splice(audioIndex, 1)
        }
        selectedAudio.value = audioIndex - 1
    }

    const isPlaying = ref(false)
    const audioElem = process.client ? new Audio() : undefined
    // const silenceFile = process.client ? (audioElem!.canPlayType('audio/ogg') ? Promise.resolve('/audio/silence.ogg') : getUncompressedSilenceFile()) : null
    function playListener() {
        isPlaying.value = true
    }
    function pauseListener() {
        if (process.client) {
            document.removeEventListener('click', pauseListener)
            isPlaying.value = false
            /* silenceFile!.then((silence) => {
                audioElem!.src = silence
                audioElem!.removeEventListener('play', playListener)
                audioElem!.play()
                setTimeout(() => {
                    audioElem!.addEventListener('play', playListener)
                }, 100)
            }) */
        }
    }

    if (process.client) {
        document.addEventListener('click', pauseListener)
        audioElem!.addEventListener('pause', pauseListener)
        audioElem!.addEventListener('play', playListener)
    }

    function playSelectedAudio() {
        audioElem!.removeEventListener('pause', pauseListener)
        audioElem!.pause()
        audioElem!.addEventListener('pause', pauseListener)
        audioElem!.src = selectedAudioUrl.value
        audioElem!.play()
    }

    function toggleSelectedAudio() {
        if (isPlaying.value) {
            audioElem!.pause()
        } else {
            playSelectedAudio()
        }
    }

    const selectedGroup = usePersistentRef<number>('selectedGroup', 0)
    const userNickname = usePersistentRef<string>('userNickname', '')
    const userIdentifier = computed({
        get() {
            if (userNickname.value) { return userNickname.value } else { return uniqueIdentifier }
        },
        set(value: string) {
            localStorage.setItem('uniqueIdentifier', value)
            uniqueIdentifier = value
        }
    })

    if (process.client) { useNuxtApp().$Sentry.setUser({ username: userNickname.value, id: userIdentifier.value }) }
    const doNotifications = computed<Promise<boolean | null> | boolean>({
        get(): Promise<boolean | null> {
            return lf.getItem<boolean>('doNotifications')
        },
        async set(value: boolean | Promise<boolean | null>) {
            lf.setItem('doNotifications', value instanceof Promise ? await value : value)
        }
    })
    const notesDirtyTime = usePersistentRef('notesDirtyTime', new Date(0).getTime())

    return {
        getInstallStep,
        setInstallStep,
        selectedAudioName,
        selectedAudioUrl,
        audioList,
        uploadCustomAudio,
        deleteCustomAudio,
        playSelectedAudio,
        toggleSelectedAudio,
        isSelectedAudioCustom,
        isPlaying,
        audio: ref(audioElem!),
        selectedGroup,
        userNickname,
        userIdentifier,
        doNotifications,
        notesDirtyTime
    }
})
