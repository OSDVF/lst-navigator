<template>
    <article>
        <h1><IconCSS name="ant-design:notification-outlined" />&ensp;Oznámení</h1>
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
    layout: 'install'
})
const supportsNotifications = 'Notification' in window

const onNextButtonClick = inject<(listener: Function) => void>('onNextButtonClick')
onNextButtonClick?.(() => Notification.requestPermission())

const skipToNextIf = inject<(ref: Ref) => void>('skipToNextIf')
skipToNextIf?.(computed(() => Notification.permission === 'granted'))
</script>
