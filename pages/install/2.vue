<template>
    <article>
        <h1><IconCSS name="ant-design:notification-outlined" />&ensp;Oznámení</h1>
        <p>Po kliknutí na <code>Další</code> povolte oprávnění pro zobrazování oznámení.</p>
    </article>
</template>

<script setup lang="ts">
definePageMeta({
    layout: 'install'
})

const onNextButtonClick = inject<(listener: Function) => void>('onNextButtonClick')
onNextButtonClick?.(() => Notification.requestPermission())

const skipToNextIf = inject<(ref: Ref) => void>('skipToNextIf')
skipToNextIf?.(computed(() => Notification.permission === 'granted'))
</script>
