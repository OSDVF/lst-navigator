<template>
    <article class="settings">
        <h4>Obecné</h4>
        <fieldset>
            <label for="selectedEvent">Událost</label>
            <span>
                <small tabindex="0" class="muted" title="ID události">{{ cloud.selectedEvent }}</small>
                <small
                    v-if="myPermission > UserLevel.Nothing" tabindex="0"
                    :title="`U této události jste ${cloud.permissionNames[myPermission]}`" class="muted ml-1">
                    <Icon :name="`mdi:${userLevelToIcon[myPermission]}`" />
                </small>
                <select id="selectedEvent" v-model="cloud.selectedEvent" class="ml-2">
                    <option v-for="event in cloud.eventsCollection" :key="event.id" :value="event.id">
                        {{ event.title }}
                    </option>
                </select>
            </span>
        </fieldset>
        <fieldset>
            <label for="transitions">
                <Icon name="mdi:animation" /> Animace
            </label>
            <span>
                <input id="transitions" v-model="settings.transitions" type="checkbox">
            </span>
        </fieldset>
        <fieldset>
            <label for="gestures">
                <Icon name="mdi:gesture-swipe-horizontal" /> Povolit gesta
                <br>
                <small class="ml-3">
                    Přesuny prstem pro navigaci
                </small>
            </label>
            <span>
                <input id="gestures" v-model="settings.gestures" type="checkbox">
            </span>
        </fieldset>
        <fieldset>
            <label for="blur" title="Efekt rozostření na pozadí menu">
                <Icon name="mdi:blur" /> Rozostřené pozadí
            </label>
            <span>
                <input id="blur" v-model="settings.blur" type="checkbox">
            </span>
        </fieldset>
        <fieldset>
            <label for="expandable">
                <Icon name="mdi:file-tree" /> Rozbalovací položky harmonogramu
                <br>
                <small class="ml-3 mt-1 inline-block">
                    Zobrazí detailní info a váš feedback u každé položky
                </small>
            </label>
            <span>
                <input id="expandable" v-model="settings.expandableItems" type="checkbox">
            </span>
        </fieldset>
        <fieldset>
            <label for="richNoteEditor">
                <Icon name="mdi:format-text" /> Rozšířený editor{{ cloud.resolvedPermissions.editSchedule ? '' : ' poznámek' }}
                <br>
                <small class="ml-3 mt-1 inline-block">
                    Formátovat text, vkládat obrázky a odkazy
                </small>
            </label>
            <span>
                <input id="richNoteEditor" v-model="settings.richNoteEditor" type="checkbox">
            </span>
        </fieldset>
        <fieldset v-if="config.public.notifications_title">
            <label for="selectedAudioName">
                <Icon name="mdi:music" /> Zvuk upozornění
            </label>
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
                <button @click="settings.toggleSelectedAudio">
                    <Icon :name="/* TODO: notification permission */settings.isPlaying ? 'mdi:stop' : 'mdi:play'" />
                </button>
            </span>
        </fieldset>
        <h4>Uživatel</h4>
        <fieldset>
            <label for="nickname">Jméno / Podpis do zpětných vazeb</label>
            <NameChangeDialog />
        </fieldset>
        <fieldset v-if="cloud.eventData?.transfers">
            <label for="transfer">
                <Icon name="mdi:leak" /> Přenos zadaných dat mezi zařízeními
            </label>
            <div>
                <NuxtLink id="transfer" to="/transfer/here" class="nowrap inline-block">
                    <Icon name="mdi:download" />&nbsp;Přenést sem
                </NuxtLink>
                <NuxtLink to="/transfer/away" class="nowrap inline-block ml-1">
                    <Icon name="mdi:upload" />&nbsp;Odeslat
                </NuxtLink>
                <NuxtLink to="/scan" class="nowrap inline-block ml-1">
                    <Icon name="mdi:qrcode" />&nbsp;Skenovat
                </NuxtLink>
            </div>
        </fieldset>
        <LazyLoginField />
        <fieldset v-show="!advanced && cloud.eventData?.advanced">
            <div>
                <button @click="advanced = true">Zobrazit pokročilá nastavení</button>
            </div>
        </fieldset>
        <fieldset v-show="advanced">
            <label>Datum synchronizace poznámek</label>
            <span>
                <small>
                    <LazyClientOnly>
                        {{
                            settings.notesDirtyTime === 0 ? 'Nikdy' : new Date(settings.notesDirtyTime).toLocaleString(lang)
                        }}
                    </LazyClientOnly>
                </small>
                &ensp;
                <button @click="syncNotes">
                    <Icon name="mdi:reload" /> Odeslat znovu
                </button>
            </span>
        </fieldset>
        <fieldset v-show="advanced">
            <label>Datum synchronizace feedbacku</label>
            <span>
                <small>
                    <LazyClientOnly>
                        {{ cloud.feedback.dirtyTime === 0 ? 'Nikdy' : new
                            Date(cloud.feedback.dirtyTime).toLocaleString(lang) }}
                    </LazyClientOnly>
                </small>
                &ensp;
                <button @click="cloud.feedback.saveAgain(true)">
                    <Icon name="mdi:reload" /> Odeslat znovu
                </button>
            </span>
        </fieldset>
        <fieldset>
            <label title="Feedback a poznámmky">Uživatelská data</label>
            <div>
                <button v-if="deleteResult !== true" title="Smazání mého feedbacku a poznámek" @click="deleteUserData()">
                    <Icon name="mdi:trash" /> Smazat
                </button>
                <ProgressBar v-if="deletePending" />
                <span v-if="deleteResult === true" style="color:green"> Smazáno </span>
                <code v-if="typeof deleteResult !== 'boolean'" class="error">{{ deleteResult }}</code>
            </div>
        </fieldset>
        <h4>Aplikace</h4>
        <fieldset v-if="config.public.installWizard && !$pwa?.isPWAInstalled && $deferredPrompt?.value">
            <label for="install">Instalace</label>
            <span>
                <button id="install" @click="$router.push(config.public.installWizard ? '/install/0' : '/schedule')">
                    <Icon name="mdi:download" /> Instalovat
                </button>
            </span>
        </fieldset>
        <fieldset>
            <p>Verze</p>
            <small :title="config.public.commitHash" @click="$nuxt.$alert(config.public.commitHash)">
                {{ config.public.version }}
                {{ config.public.commitMessageTime }}
            </small>

        </fieldset>
        <fieldset>
            <span>Poslední aktualizace</span>
            <p>
                <LazyClientOnly>
                    {{ new Date(parseInt(config.public.compileTime)).toLocaleString(lang) }}{{
                        leadingPlus(-parseInt(config.public.compileTimeZone) / 60) }}
                </LazyClientOnly>
                &nbsp;
                <AppManageBtns />
            </p>
        </fieldset>
        <fieldset>
            <span>Hlášení chyb</span>
            <small>
                <LazyClientOnly>
                    <a :href="`mailto:${config.public.supportEmail}`">{{ config.public.supportEmail }}</a>
                </LazyClientOnly>
            </small>
        </fieldset>
        <fieldset>
            <NuxtLink to="/about">O aplikaci</NuxtLink>
        </fieldset>
    </article>
</template>

<script setup lang="ts">
import { setDoc } from '~/utils/trace'
import { doc } from 'firebase/firestore'
import { useSettings } from '@/stores/settings'
import { useCloudStore } from '@/stores/cloud'
import { UserLevel, userLevelToIcon } from '~/types/cloud'
import { NuxtLink } from '#components'
definePageMeta({
    title: 'Nastavení',
})

const settings = useSettings()
const cloud = useCloudStore()
const config = useRuntimeConfig()
const uploading = ref(false)
const audioInputField = ref<HTMLInputElement | null>(null)
const myPermission = computed(() => cloud.user.info?.permissions?.[cloud.selectedEvent] as UserLevel)
const advanced = ref(false)
const deletePending = ref(false)
const deleteResult = ref(false)

const lang = computed(() => import.meta.client ? navigator.language : 'cs-CZ')

function leadingPlus(value: number) {
    return value > 0 ? `+${value}` : value
}
function deleteUserData() {
    deleteResult.value = false
    deletePending.value = true
    if (confirm('Chcete navždy smazat vaše poznámky a feedback k události ' + (cloud.eventData?.title ?? cloud.selectedEvent) + '?')) {
        cloud.user.deleteData()
            .then(() => {
                deleteResult.value = true
            }).catch(err => {
                deleteResult.value = err
            })
            .finally(() => deletePending.value = false)
    }
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
async function syncNotes() {
    if (cloud.notesCollection) {
        for (const key in localStorage) {
            if (key.startsWith('note.')) {
                const value = localStorage.getItem(key)
                const indexes = key.split('.')
                await setDoc(doc(cloud.notesCollection, settings.userIdentifier), {
                    [indexes[1]]: {
                        [indexes[2]]: value,
                    },
                }, {
                    merge: true,
                })
            }
        }
    } else {
        alert('Nepodařilo se připojit k úložišti poznámek')
    }
}
</script>


<style lang="scss">
@use "sass:color";
@use "@/assets/styles/constants" as c;

.settings fieldset {
    display: flex;
    justify-content: stretch;
    align-items: center;
    padding: 1rem;
    border: 0;
    border-bottom: 1px solid rgba(color.adjust(c.$link-background, $lightness: -50%), .2);

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
