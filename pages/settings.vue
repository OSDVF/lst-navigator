<template>
    <article>
        <fieldset>
            <label for="selectedAudioName">Zvuk upozornění</label>
            <span>
                <select id="selectedAudioName" v-model="settings.selectedAudioName">
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
        <!--<fieldset>
            <label for="group">Skupina</label>
            <span>
                <select id="group" v-model="settings.selectedGroup">
                    <option v-for="(groupName, index) in cloud.groupNames" :key="groupName" :value="index - 1">
                        {{ groupName }}
                    </option>
                </select>
            </span>
        </fieldset>-->
        <h4>Individuální nastavení</h4>
        <fieldset>
            <label for="nickname">Jméno / Podpis do zpětných vazeb</label>
            <ClientOnly>
                <form @submit.prevent>
                    <input id="nickname" v-model="tempNickname" :disabled="!!settings.userNickname">
                    <button
                        v-if="!!settings.userNickname"
                        @click="confirmDialog('Změna jména způsobí ztrátu všech poznámek a feedbacku') ? tempNickname = settings.userNickname = '' : null"
                    >
                        <IconCSS name="mdi:alert" /> Změnit
                    </button>
                    <button
                        v-else
                        @click="confirmDialog('Jméno by mělo být v rámci akce unikátní. Jeho změna v budoucnu může způsobit ztrátu přístupu k tvému feedbacku a poznámkám.') ? settings.userNickname = tempNickname : null"
                    >
                        <IconCSS name="material-symbols:save" /> Uložit
                    </button>
                </form>
            </ClientOnly>
        </fieldset>
        <fieldset>
            <label>Datum synchronizace poznámek</label>
            <span>
                <small>
                    <ClientOnly>
                        {{ settings.notesDirtyTime === 0 ? 'Nikdy' : new Date(settings.notesDirtyTime) }}
                    </ClientOnly>
                </small>
                &ensp;
                <button @click="syncNotes">
                    <IconCSS name="mdi:reload" /> Odeslat znovu
                </button>
            </span>
        </fieldset>
        <fieldset>
            <label>Datum synchronizace feedbacku</label>
            <span>
                <small>
                    <ClientOnly>
                        {{ cloud.feedbackDirtyTime === 0 ? 'Nikdy' : new Date(cloud.feedbackDirtyTime) }}
                    </ClientOnly>
                </small>
                &ensp;
                <button @click="cloud.saveAgainAllFeedback">
                    <IconCSS name="mdi:reload" /> Odeslat znovu
                </button>
            </span>
        </fieldset>
        <h4>O aplikaci</h4>
        <fieldset>
            <p>Verze</p>
            <p>
                <ClientOnly>
                    {{ new Date(parseInt(config.public.compileTime)).toLocaleString() }}
                    {{ leadingPlus(parseInt(config.public.compileTimeZone) / 60) }}
                </ClientOnly>
            </p>
        </fieldset>
        <fieldset>
            <span>Poslední aktualizace</span>
            <small>{{ config.public.commitMessageTime }}</small>
        </fieldset>
    </article>
</template>

<script setup lang="ts">
import { setDoc } from 'firebase/firestore'
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
const tempNickname = ref(toRaw(settings.userNickname))
function confirmDialog(message: string) {
    if (process.server) { return false }
    return window.confirm(message)
}
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
function syncNotes() {
    if (cloud.notesDocument) {
        for (const key in localStorage) {
            if (key.startsWith('note.')) {
                const value = localStorage.getItem(key)
                const indexes = key.split('.')
                setDoc(cloud.notesDocument, {
                    [indexes[1]]: {
                        [indexes[2]]: {
                            [settings.userIdentifier]: value
                        }
                    }
                })
            }
        }
    } else {
        alert('Nepodařilo se připojit k úložišti poznámek')
    }
}
</script>

<style lang="scss" scoped>
@use "sass:color";
@import "@/assets/styles/constants.scss";

fieldset {
    display: flex;
    justify-content: stretch;
    align-items: center;
    padding: 1rem;
    border: 0;
    border-bottom: 1px solid rgba(color.adjust($link-background, $lightness: -50%), .2);

    &>* {
        flex-grow: 1;

        &:not(:first-child) {
            text-align: end;
        }
    }
}
</style>
