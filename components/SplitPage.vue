<template>
    <div
        :class="{
            'pl-2': true,
            'pr-2': true,
            'article': !split
        }">
        <slot name="header" />
        <div :class="split ? 'split' : ''">
            <slot />
        </div>
    </div>
</template>

<script setup lang="ts">
defineProps<{
    split?: boolean
}>()
</script>