<template>
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

<script setup lang="ts">
const props = defineProps<{
    error: string
    clearError: () => void
}>()
</script>