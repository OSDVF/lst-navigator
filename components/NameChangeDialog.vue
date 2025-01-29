<template>
    <LazyClientOnly>
        <form v-bind="$attrs" @submit.prevent>
            <slot />
            <input
                id="nickname" ref="input" v-model="settings.userNickname" v-paste-model placeholder="Klikněte pro vytvoření "
                :style="{
                    textAlign: settings.userNickname ? 'left' : 'right',
                }">
            <br>
            <small class="muted-2" title="Unikátní identifikátor uživatele/instalace">UID:
                {{ settings.userIdentifier
                }}</small>
        </form>
    </LazyClientOnly>
</template>

<script lang="ts" setup>
import { useSettings } from '@/stores/settings'
const settings = useSettings()
</script>