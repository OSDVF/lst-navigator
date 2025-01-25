<template>
    <article>
        <h1>
            <Icon name="ant-design:notification-outlined" />&ensp;Oznámení
        </h1>
        <p v-if="supportsNotifications">
            <Icon name="mdi:alert" /> Váš prohlížeč nepodporuje notifikace
        </p>
        <p v-else>
            Po kliknutí na <code>Další</code> povolte oprávnění pro zobrazování oznámení.
        </p>
    </article>
</template>

<script setup lang="ts">
definePageMeta({
    layout: 'install',
})
const config = useRuntimeConfig()
const supportsNotifications = import.meta.client ? 'Notification' in window : false

const onNextButtonClick = inject<(listener: () => void) => void>('onNextButtonClick')
onNextButtonClick?.(() => supportsNotifications ? Notification.requestPermission() : null)

const skipToNextIf = inject<(ref: Ref) => void>('skipToNextIf')
skipToNextIf?.(computed(() => !config.public.notifications_title || supportsNotifications ? Notification.permission === 'granted' : null))
</script>
