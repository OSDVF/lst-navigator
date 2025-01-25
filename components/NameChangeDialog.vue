<template>
    <LazyClientOnly>
        <form @submit.prevent>
            <slot />
            <input
                id="nickname" ref="input" v-model="tempNickname" v-paste-model placeholder="Klikněte pro vytvoření "
                :disabled="!!settings.userNickname" :style="{
                    border: tempNickname ? 'unset' : '0',
                    textAlign: tempNickname ? 'unset' : 'right',
                }" @focus="focus = true" @blur="focus = false">
            <button
                v-if="!!settings.userNickname"
                @click="() => confirmDialog('Změna jména způsobí ztrátu všech poznámek a feedbacku') ? tempNickname = settings.userNickname = '' : null">
                <Icon name="mdi:alert" /> Změnit
            </button>
            <button v-if="!tempNickname" @click="input?.focus()">
                <Icon name="mdi:pencil" />
            </button>
            <button v-else @click="change">
                <Icon name="material-symbols:save" /> {{ focus ? '' : 'Uložit' }}
            </button>
            <br>
            <small class="muted">UID: {{ settings.userIdentifier }}</small>
        </form>
    </LazyClientOnly>
</template>

<script lang="ts" setup>
import { useSettings } from '@/stores/settings'

const settings = useSettings()
const tempNickname = ref(toRaw(settings.userNickname))
const input = useTemplateRef('input')
const focus = ref(false)

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
    }
}
</script>