<template>
    <fieldset class="relative">
        <label>
            <template v-if="cloudStore.resolvedPermissions.superAdmin">
                <Icon name="mdi:shield-lock-open" title="Úpravy povoleny" />
                &nbsp;
            </template>
            <template v-else-if="cloudStore.user.auth?.photoURL">
                <img
                    class="noinvert" referrerPolicy="no-referrer" crossorigin="anonymous"
                    :src="cloudStore.user.auth.photoURL" alt="Profilový obrázek" width="24" height="24"
                >
                &nbsp;
            </template>
            <LazyLazyClientOnly>
                {{ cloudStore.user.pendingPopup ? 'Postupujte podle pokynů v druhém okně' :
                    cloudStore.user.auth?.displayName ?? prettyError ?? 'Přihlášení' }} <span
                    v-if="cloudStore.user.auth?.email"
                    class="muted nowrap"
                >{{
                    cloudStore.user.auth.email }}</span>
            </LazyLazyClientOnly>
        </label>
        <span>
            <LazyLazyClientOnly>
                <button v-if="cloudStore.user.auth?.uid" @click="cloudStore.user.signOut">
                    <Icon name="mdi:logout" /> Odhlásit
                </button>
                <button v-else @click="cloudStore.user.signIn()">
                    <Icon name="mdi:login" /> Přihlásit
                </button>
                <ProgressBar v-if="cloudStore.user.pendingAction" class="absolute left-0 bottom-0 right-0" />
            </LazyLazyClientOnly>
        </span>
    </fieldset>
</template>

<script setup lang="ts">
import { useCloudStore } from '@/stores/cloud'

const cloudStore = useCloudStore()
const prettyError = ref()
const previousCode = ref()

watchEffect(() => {
    if (cloudStore.user.error?.code) {
        if (cloudStore.user.error.code === previousCode.value) { return }
        previousCode.value = cloudStore.user.error.code
    }
    switch (cloudStore.user.error?.code) {
    case 'auth/popup-blocked':
        alert('Přihlášení bylo zablokováno vaším prohlížečem. Povolte vyskakovací okna (pop-up)')
        setTimeout(() => location.reload(), 7000)
        break
    case 'auth/cancelled-popup-request':
        alert('Pravděpodobně již máte otevřeno jiné přihlašovací okno')
        break
    case 'auth/popup-closed-by-user':
        prettyError.value = 'Přihlašovací okno bylo zavřeno uživatelem'
        break
    default:
        prettyError.value = cloudStore.user.error
        break
    }
})

</script>
