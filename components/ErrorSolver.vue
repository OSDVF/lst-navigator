<template>
    <NuxtErrorBoundary @error="captureError">
        <slot />
        <template #error="props">
            <main>
                <article>
                    <h1>Chyba</h1>
                    <p>
                        <code class="error">{{ props.error }}</code>
                    </p>
                    <button @click="props.clearError">
                        <Icon name="mdi:emoticon" /> Ignorovat
                    </button>
                    <p>
                        Pokud chyba přetrvává, zkuste
                        <AppManageBtns />
                    </p>
                </article>
            </main>
        </template>
    </NuxtErrorBoundary>
</template>

<script setup lang="ts">
const app = useNuxtApp()


function captureError(error: unknown) {
    try {
        console.error(error, error instanceof TypeError ? error.stack : null)
        app.$Sentry.captureException(error)
    } catch (e) { console.error(e) }
}
</script>