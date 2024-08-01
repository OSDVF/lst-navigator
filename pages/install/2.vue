<template>
    <article>
        <h1>
            <IconCSS name="ant-design:notification-outlined" />&ensp;Oznámení
        </h1>
        <p v-if="supportsNotifications">
            <IconCSS name="mdi:alert" /> Váš prohlížeč nepodporuje notifikace
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
const supportsNotifications = import.meta.client ? 'Notification' in window : false

const onNextButtonClick = inject<(listener: () => void) => void>('onNextButtonClick')
onNextButtonClick?.(() => supportsNotifications ? Notification.requestPermission() : null)

const skipToNextIf = inject<(ref: Ref) => void>('skipToNextIf')
skipToNextIf?.(computed(() => supportsNotifications ? Notification.permission === 'granted' : null))
</script>
