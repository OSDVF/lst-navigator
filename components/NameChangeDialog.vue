<template>
    <ClientOnly>
        <form @submit.prevent>
            <slot />
            <input id="nickname" v-model="tempNickname" v-paste-model :disabled="!!settings.userNickname">
            <button
                v-if="!!settings.userNickname"
                @click="() => confirmDialog('Změna jména způsobí ztrátu všech poznámek a feedbacku') ? tempNickname = settings.userNickname = '' : null">
                <Icon name="mdi:alert" /> Změnit
            </button>
            <button v-else @click="change">
                <Icon name="material-symbols:save" /> Uložit
            </button>
            <br>
            <small class="muted">UID: {{ settings.userIdentifier }}</small>
        </form>
    </ClientOnly>
</template>

<script lang="ts" setup>
import { useSettings } from '@/stores/settings'
import { useCloudStore } from '@/stores/cloud'

const settings = useSettings()
const tempNickname = ref(toRaw(settings.userNickname))
const cloud = useCloudStore()
watch(settings, (s) => {
    if (s.userNickname !== tempNickname.value && tempNickname.value !== '') {
        tempNickname.value = s.userNickname
    }
})

function confirmDialog(message: string) {
    if (import.meta.server) { return false }
    return window.confirm(message)
}

function change() {
    if (confirmDialog('Jméno by mělo být v rámci akce unikátní. Jeho změna znamená ztrátu přístupu k současnému feedbacku a poznámkám.')) {
        settings.userNickname = tempNickname.value
        cloud.feedback.dirtyTime = 0// force refresh from remote
        cloud.feedback.hydrate(cloud.feedback.online)
    }
}
</script>
