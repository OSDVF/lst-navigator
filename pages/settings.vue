<template>
    <article>
        <label>Zvuk upozornění</label>
        <select v-model="selectedSound">
            <option>Hadovky</option>
            <option>Líbezný zpěv</option>
        </select>
    </article>
</template>

<script setup lang="ts">
import { WritableComputedRef } from 'vue'
definePageMeta({
    title: 'Nastavení'
})

const selectedSound : WritableComputedRef<string> = computed({
    get() {

    }
})
</script>
