<template>
    <div v-if="ui.error">
        <p class="error">
            {{ ui.error }}
        </p>
        <button v-if="ui.ignorable" type="button" class="large" @click="ui.ignoreError">
            <Icon name="mdi:arrow-right" /> {{ ui.ignoreText }}
        </button>
        <button type="button" class="large" @click="ui.clearError">
            <Icon name="mdi:cancel" /> {{ ui.ignorable? 'Zpět' : 'Skrýt' }}
        </button>
    </div>
</template>

<script setup lang="ts">
const ui = useUI()
</script>
