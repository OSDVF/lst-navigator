<template>
    <LazyClientOnly>
        <form v-bind="$attrs" @submit.prevent>
            <slot />
            <input
                v-if="cloud.user.auth" id="nickname" ref="input" v-model="remoteUserNickname" v-paste-model
                placeholder="Vytvořit podpis " :style="{
                    textAlign: remoteUserNickname ? 'left' : 'right',
                }">
            <input
                v-else id="nickname" ref="input" v-model="settings.userNickname.value" v-paste-model
                placeholder="Vytvořit podpis " :style="{
                    textAlign: settings.userNickname.value ? 'left' : 'right',
                }">
            <br>
            <small class="muted-2" title="Unikátní identifikátor uživatele/instalace">UID:
                {{ cloud.user.signatureId }}
            </small>
        </form>
    </LazyClientOnly>
</template>

<script lang="ts" setup>
import { useSettings } from '@/stores/settings'
import { GoogleAuthProvider } from 'firebase/auth'
import { updateCurrentUserProfile } from 'vuefire'
import type { UserInfo } from '~/types/cloud'
import { setDoc as setDocT } from '~/utils/trace'

const settings = useSettings()
const cloud = useCloudStore()
const remoteUserNickname = computed({
    get() {
        return cloud.user.info?.signature[cloud.selectedEvent]
    },
    set(value: string) {
        if (cloud.user.auth) {
            if (cloud.user.auth.providerData[0].providerId !== GoogleAuthProvider.PROVIDER_ID) {
                updateCurrentUserProfile({
                    displayName: value,
                })
            }

            setDocT(cloud.user.doc!, {
                signature: {
                    ...cloud.user.info?.signature,
                    [cloud.selectedEvent]: value,
                },
            } as UserInfo, {merge: true})
        } else {
            cloud.user.error = 'Nepodařilo se změnit online hodnotu'
        }
    },
})

</script>