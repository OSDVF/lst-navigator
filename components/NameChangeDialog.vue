<template>
    <LazyClientOnly>
        <form v-bind="attr" @submit.prevent>
            <slot />
            <input
                id="nickname" ref="input" v-model="tempNickname" v-paste-model placeholder="Klikněte pro vytvoření "
                :disabled="!!settings.userNickname" :style="{
                    border: tempNickname ? 'unset' : '0',
                    textAlign: tempNickname ? 'left' : 'right',
                }" @focus="focus = true" @blur="focus = false">
            <button
                v-if="!!settings.userNickname"
                @click="() => confirmDialog('Změna jména způsobí ztrátu všech poznámek a feedbacku') ? tempNickname = settings.userNickname = '' : null">
                <Icon name="mdi:alert" class="mb-0.5e" /> Změnit
            </button>
            <button v-else-if="!tempNickname" @click="input?.focus()">
                <Icon name="mdi:pencil" class="mb-0.5e" />
            </button>
            <button v-else @click="change">
                <Icon name="material-symbols:save" class="mb-0.5e" /> {{ focus ? '' : 'Uložit' }}
            </button>
            <br>
            <small v-if="!settings.userNickname" class="muted-2" title="Unikátní identifikátor uživatele/instalace">UID:
                {{ settings.userIdentifier
                }}</small>
        </form>
    </LazyClientOnly>
</template>

<script lang="ts" setup>
import { useSettings } from '@/stores/settings'

const settings = useSettings()
const tempNickname = ref(toRaw(settings.userNickname))
const input = useTemplateRef('input')
const focus = ref(false)
const attr = useAttrs()

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