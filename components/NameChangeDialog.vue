<template>
    <LazyClientOnly>
        <form v-bind="$attrs" @submit.prevent>
            <slot />
            <input
                id="nickname" ref="input" v-model="settings.userNickname.value" v-paste-model placeholder="Vytvořit podpis "
                :style="{
                    textAlign: settings.userNickname.value ? 'left' : 'right',
                }">
            <br>
            <small class="muted-2" title="Unikátní identifikátor uživatele/instalace">UID:
                {{ settings.userIdentifier.value
                }}</small>
        </form>
    </LazyClientOnly>
</template>

<script lang="ts" setup>
import { useSettings } from '@/stores/settings'
const settings = useSettings()
</script>