<template>
    <img v-bind="$attrs" :crossorigin="cross ? 'anonymous' : undefined" @error="cross = true">
</template>

<script setup lang="ts">
const cross = ref(false)//try first without crossorigin, then with it
</script>