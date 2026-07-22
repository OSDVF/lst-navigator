<template>
    <small class="muted">Formát: {{ f }}</small>
</template>

<script setup lang="ts">
const f = getBrowserDateFormat()
</script>
