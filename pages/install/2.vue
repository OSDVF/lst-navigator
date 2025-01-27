<template>
    <article>
        <h1>
            <Icon name="ant-design:notification-outlined" />&ensp;Oznámení
        </h1>
        <LazyClientOnly>
            <p v-if="supportsNotifications">
                <Icon name="mdi:alert" /> Váš prohlížeč nepodporuje notifikace
            </p>
            <p v-else>
                Po kliknutí na <code>Povolit</code> povolte oprávnění pro zobrazování oznámení.
            </p>
        </LazyClientOnly>
    </article>
</template>

<script setup lang="ts">
definePageMeta({
    layout: 'install',
})
const config = useRuntimeConfig()
const supportsNotifications = ref(false)
const skip = computed(() => {
    return !config.public.notifications_title || granted.value || supportsNotifications.value ? Notification.permission === 'granted' : true
})

if (import.meta.browser) {
    const nextText = inject<Ref<string>>('nextText')
    if (nextText) {
        nextText.value = 'Povolit'
    }
}

const granted = ref(false)

onMounted(() => {
    supportsNotifications.value = 'Notification' in window
    if (!skip.value) {
        Notification.requestPermission().then(permission => {
            granted.value = permission === 'granted'
        })
    }
})

const onNextButtonClick = inject<(listener: () => void) => void>('onNextButtonClick')
onNextButtonClick?.(() => supportsNotifications.value ? Notification.requestPermission() : null)

const skipToNextIf = inject<(ref: Ref) => void>('skipToNextIf')
skipToNextIf?.(skip)
</script>
