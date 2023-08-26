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
            <NameChangeDialog />
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
        <fieldset>
            <label>
                <IconCSS v-if="cloud.permissions === 'admin'" name="mdi:shield-lock-open" title="Úpravy povoleny" />
                <img v-else-if="user?.photoURL" referrerPolicy="no-referrer" crossorigin="anonymous" :src="user.photoURL" alt="Profilový obrázek" width="24" height="24">
                {{ user?.displayName ?? error ?? 'Přihlášení' }} <span v-if="user?.email" class="muted nowrap">{{ user.email }}</span>
            </label>
            <span>
                <button v-if="user" @click="logout">
                    <IconCSS name="mdi:logout" /> Odhlásit
                </button>
                <button v-else @click="signIn">
                    <IconCSS name="mdi:login" /> Přihlásit
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
import {
    signOut,
    GoogleAuthProvider,
    getRedirectResult,
    signInWithPopup
} from 'firebase/auth'
import { useFirebaseAuth } from 'vuefire'
import { useSettings } from '@/stores/settings'
import { useCloudStore } from '@/stores/cloud'
definePageMeta({
    title: 'Nastavení'
})

const settings = useSettings()
const cloud = useCloudStore()
const config = useRuntimeConfig()
const auth = useFirebaseAuth()
const user = useCurrentUser()
const uploading = ref(false)
const audioInputField = ref<HTMLInputElement | null>(null)

function leadingPlus(value: number) {
    return value > 0 ? `+${value}` : value
}
function logout() {
    signOut(auth!)
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
                }, {
                    merge: true
                })
            }
        }
    } else {
        alert('Nepodařilo se připojit k úložišti poznámek')
    }
}

// display errors if any
const error = ref(null)
function signIn() {
    signInWithPopup(auth!, googleAuthProvider)
        .then((result) => {
            if (cloud.feedbackDoc) {
                if (cloud.onlineFeedbackRef?.[result.user.uid]) {
                    if (confirm('Tento účet již byl použit pro zpětnou vazbu. Chcete do tohoto zařízení načíst vaši předchozí zpětnou vazbu? Bude přepsán aktuálně offline uložený stav.')) {
                        settings.userIdentifier = cloud.onlineFeedbackRef[result.user.uid].offlineUserIdentifier
                        settings.userNickname = cloud.onlineFeedbackRef[result.user.uid].offlineUserName
                    }
                }

                setDoc(cloud.feedbackDoc, {
                    [result.user.uid]: {
                        name: result.user.displayName,
                        offlineUserName: settings.userNickname,
                        offlineUserIdentifier: settings.userIdentifier,
                        email: result.user.email,
                        photoURL: result.user.photoURL,
                        timestamp: Date.now()
                    }
                }, {
                    merge: true
                })
            }
            console.log(result)
        }).catch((reason) => {
            console.error('Failed signin', reason)
            error.value = reason
        })
}
// only on client side
onMounted(() => {
    getRedirectResult(auth!).catch((reason) => {
        console.error('Failed redirect result', reason)
        error.value = reason
    })
})
</script>

<script lang="ts">
export const googleAuthProvider = new GoogleAuthProvider()// Is here in classic <script> because <script setup> is unique for instance
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

    img {
        vertical-align: middle;
        border-radius: 50%;
        margin-right: .5rem;
    }
}
</style>
