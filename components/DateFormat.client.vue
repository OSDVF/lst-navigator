<template>
    <small class="muted">Formát: {{ f }}</small>
</template>

<script setup lang="ts">
import { getBrowserDateFormat } from '~/utils/types'
const f = getBrowserDateFormat()
</script>