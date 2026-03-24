<template>
    <img v-bind="$attrs" ref="image" :crossorigin="cross ? 'anonymous' : undefined" @error="cross = true">
</template>

<script setup lang="ts">
const cross = ref(false)//try first without crossorigin, then with it
const image = useTemplateRef<HTMLImageElement>('image')
defineExpose({
    image,
})
</script>