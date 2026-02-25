<template>
    <article>
        <div v-if="cloud.eventDescription?.form">
            <p>
                Probíhá přesměrování...
            </p>
            <a ref="link" :href="cloud.eventDescription.form" target="_blank" rel="noopener noreferrer">
                <Icon name="mdi:link" style="transform: rotate(45deg);" /> Klikněte sem, pokud se přihláška neotevřela
            </a>
        </div>
        <span v-else>
            Událost <strong>{{ cloud.eventDescription?.title ?? cloud.selectedEvent }}</strong> nemá přiřazenou
            přihlášku.
            <br>
            Pokud je to chyba, kontaktujte organizátory <code>{{ $config.public.organizerEmail }}</code> nebo technickou
            podporu <code>{{ $config.public.supportEmail }}</code>.
        </span>
        <p>
            <NuxtLink to="/" replace>
                <Icon name="mdi:apps" /><Icon name="mdi:arrow-left" /> Zpět na seznam událostí
            </NuxtLink>
        </p>
    </article>
</template>

<script lang="ts" setup>
const cloud = useCloudStore()
const link = useTemplateRef<HTMLAnchorElement>('link')
const route = useRoute()
onMounted(() => {
    watchEffect(() => {
        // The eventDescription ref can be outdated
        if (cloud.eventDescription?.id == route.params.event && cloud.eventDescription?.form) {
            link.value?.click()
            setTitle('Přihláška - ' + cloud.eventDescription.title)
        }
    })
})

definePageMeta({
    layout: 'front-page',
})
</script>