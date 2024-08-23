<template>
    <ClientOnly>
        <form @submit.prevent>
            <slot />
            <input id="nickname" v-model="tempNickname" v-paste-model :disabled="!!settings.userNickname">
            <button
                v-if="!!settings.userNickname"
                @click="() => confirmDialog('Změna jména způsobí ztrátu všech poznámek a feedbacku') ? tempNickname = settings.userNickname = '' : null"
            >
                <Icon name="mdi:alert" /> Změnit
            </button>
            <button
                v-else
                @click="confirmDialog('Jméno by mělo být v rámci akce unikátní. Jeho změna v budoucnu může způsobit ztrátu přístupu k tvému feedbacku a poznámkám.') ? settings.userNickname = tempNickname : null"
            >
                <Icon name="material-symbols:save" /> Uložit
            </button>
            <br>
            <small class="muted">UID: {{ settings.userIdentifier }}</small>
        </form>
    </ClientOnly>
</template>

<script lang="ts" setup>
import { useSettings } from '@/stores/settings'
const settings = useSettings()
const tempNickname = ref(toRaw(settings.userNickname))
watch(settings, (s) => {
    if (s.userNickname !== tempNickname.value && tempNickname.value !== '') {
        tempNickname.value = s.userNickname
    }
})

function confirmDialog(message: string) {
    if (import.meta.server) { return false }
    return window.confirm(message)
}
</script>
