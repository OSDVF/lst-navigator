<template>
    <article>
        <fieldset>
            <label>Zvuk upozornění</label>
            <span>
                <select v-model="settings.selectedAudioName">
                    <option v-for="audioItem in settings.audioList" :key="audioItem.name" :value="audioItem.name">
                        {{ audioItem.name }}
                    </option>
                    <option @click="uploadCustomClick">
                        Nahrát vlastní...
                    </option>
                </select>
                &ensp;
                <input v-show="uploading" ref="audioInputField" type="file" accept="audio/*" @change="uploadAudio">
                <button v-if="settings.isSelectedAudioCustom" @click="deleteCustomAudio">
                    Smazat
                </button>
                &ensp;
                <button @click="settings.toggleSelectedAudio">
                    <IconCSS :name="settings.isPlaying ? 'mdi:stop' : 'mdi:play'" />
                </button>
            </span>
        </fieldset>
        <fieldset>
            <label>Skupina</label>
            <span>
                <select v-model="settings.selectedGroup">
                    <option v-for="(groupName, index) in cloud.groupNames" :key="groupName" :value="index - 1">
                        {{ groupName }}
                    </option>
                </select>
            </span>
        </fieldset>
        <h4>O aplikaci</h4>
        <fieldset>
            Verze
            <p>{{ new Date(parseInt(config.public.compileTime)).toLocaleString() }}{{ leadingPlus(parseInt(config.public.compileTimeZone)/60) }}</p>
        </fieldset>
        <fieldset>
            Poslední aktualizace
            <small>{{ config.public.commitMessageTime }}</small>
        </fieldset>
    </article>
</template>

<script setup lang="ts">
import { useSettings } from '@/stores/settings'
import { useCloudStore } from '@/stores/cloud'
definePageMeta({
    title: 'Nastavení'
})

const settings = useSettings()
const cloud = useCloudStore()
const config = useRuntimeConfig()
const uploading = ref(false)
const audioInputField = ref<HTMLInputElement | null>(null)
function leadingPlus(value: number) {
    return value > 0 ? `+${value}` : value
}
function uploadCustomClick() {
    uploading.value = true
    audioInputField.value?.click()
}
function uploadAudio(e: Event) {
    const target = e.target as HTMLInputElement
    if (target.files?.length) {
        const file = target.files[0]
        settings.uploadCustomAudio(file)
        uploading.value = false
    }
}
function deleteCustomAudio() {
    settings.deleteCustomAudio(settings.selectedAudioName)
}
</script>

<style lang="scss">
@use "sass:color";
@import "@/assets/styles/constants.scss";

fieldset {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border: 0;
    border-bottom: 1px solid rgba(color.adjust($link-background, $lightness: -50%), .2);
}
</style>
