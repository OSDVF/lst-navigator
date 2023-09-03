<template>
    <fieldset>
        <label>
            <IconCSS v-if="cloud.resolvedPermissions.editSchedule" name="mdi:shield-lock-open" title="Úpravy povoleny" />
            <img
                v-else-if="cloud.user.auth?.photoURL" class="noinvert" referrerPolicy="no-referrer" crossorigin="anonymous"
                :src="cloud.user.auth.photoURL" alt="Profilový obrázek" width="24" height="24"
            >
            {{ cloud.user.auth?.displayName ?? cloud.user.error ?? 'Přihlášení' }} <span v-if="cloud.user.auth?.email" class="muted nowrap">{{
                cloud.user.auth.email }}</span>
        </label>
        <span>
            <button v-if="cloud.user.auth?.uid" @click="cloud.user.signOut">
                <IconCSS name="mdi:logout" /> Odhlásit
            </button>
            <button v-else @click="cloud.user.signIn">
                <IconCSS name="mdi:login" /> Přihlásit
            </button>
        </span>
    </fieldset>
</template>

<script setup lang="ts">
import { useCloudStore } from '@/stores/cloud'

const cloud = useCloudStore()

</script>

<script lang="ts">
// Is here in classic <script> because <script setup> is unique for instance
</script>
