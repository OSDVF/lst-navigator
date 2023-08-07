import localforage from 'localforage'
import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import { unzip } from 'unzipit'

async function getUncompressedSilenceFile() {
    const compressed = '/audio/silence.zip'
    const { entries } = await unzip(compressed)
    const file = Object.entries(entries).find(([key]) => key.endsWith('.mp3'))
    const arrayBuffer = await file?.[1].arrayBuffer()
    if (!arrayBuffer) { throw new Error('Could not load silence file') }
    return URL.createObjectURL(new Blob([arrayBuffer], { type: 'audio/mpeg' }))
}

export const useSettings = defineStore('settings', () => {
    function getInstallStep() {
        return localforage.getItem<number>('installStep')
    }

    function setInstallStep(newValue: number) {
        localforage.setItem('installStep', newValue)
    }

    async function getUploadedAudio() {
        const audioList: { name: string, url: string }[] = []
        const list = await localforage.getItem<string[]>('uploadedAudioList') || []
        for (const item of list) {
            const blob = await localforage.getItem<Blob>(item)
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

    const selectedAudio = useStorage<number | string>('selectedAudio', 0)
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
            await localforage.setItem(niceName, blob)
            const list = await localforage.getItem<string[]>('uploadedAudioList') || []
            list.push(niceName)
            await localforage.setItem('uploadedAudioList', list)
            audioList.value.push({ name: niceName, url: URL.createObjectURL(blob) })
            selectedAudio.value = audioList.value.length - 1
        }
    }

    async function deleteCustomAudio(name: string) {
        localforage.removeItem(name)
        const list = await localforage.getItem<string[]>('uploadedAudioList') || []
        const index = list.findIndex(item => item === name)
        if (index !== -1) {
            list.splice(index, 1)
            localforage.setItem('uploadedAudioList', list)
        }
        const audioIndex = audioList.value.findIndex(item => item.name === name)
        if (audioIndex !== -1) {
            audioList.value.splice(audioIndex, 1)
        }
        selectedAudio.value = audioIndex - 1
    }

    const isPlaying = ref(false)
    const audioElem = new Audio()
    const silenceFile = audioElem.canPlayType('audio/ogg') ? Promise.resolve('/audio/silence.ogg') : getUncompressedSilenceFile()
    function playListener() {
        isPlaying.value = true
    }
    function pauseListener () {
        document.removeEventListener('click', pauseListener)
        isPlaying.value = false
        silenceFile.then((silence) => {
            audio.value.src = silence
            audioElem.removeEventListener('play', playListener)
            audio.value.play()
            setTimeout(() => {
                audioElem.addEventListener('play', playListener)
            }, 100)
        })
    }

    document.addEventListener('click', pauseListener)
    audioElem.addEventListener('pause', pauseListener)
    audioElem.addEventListener('play', playListener)

    const audio = ref(audioElem)
    function playSelectedAudio() {
        audioElem.removeEventListener('pause', pauseListener)
        audio.value.pause()
        audioElem.addEventListener('pause', pauseListener)
        audio.value.src = selectedAudioUrl.value
        audio.value.play()
    }

    function toggleSelectedAudio() {
        if (isPlaying.value) {
            audio.value.pause()
        } else {
            playSelectedAudio()
        }
    }

    const selectedGroup = useStorage<number>('selectedGroup', 0)
    const userNickname = useStorage<string>('userNickname', '')

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
        audio,
        selectedGroup,
        userNickname
    }
})
