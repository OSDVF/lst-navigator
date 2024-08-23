<template>
    <article>
        <template v-if="cloud.feedback.fetchFailed">
            <h1>Chyba při odesílání zpětné vazby</h1>
            <p>{{ cloud.feedback.dirtyTime }}</p>
            <p>Tvé odpovědi jsou každopádně uložené offline, takže to zkus znovu později.</p>
            <button @click="cloud.feedback.saveAgain">
                <Icon name="mdi:save" /> Zkusit znovu
            </button>
        </template>
        <template v-else>
            <h1>Díky za tvůj čas!</h1>
            <p>Tvá odpověď je pro nás důležitá, abychom věděli, co do příště změnit a co naopak zachovat.</p>
            <p>Odesláno <em>{{ new Date(cloud.feedback.dirtyTime).toLocaleString(lang) }}</em></p>
        </template>
    </article>
</template>

<script setup lang="ts">
import { useCloudStore } from '@/stores/cloud'
const cloud = useCloudStore()
const lang = computed(() => import.meta.client ? navigator.language : 'cs-CZ')
</script>
