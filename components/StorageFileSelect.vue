<template>
    <FileTree v-model="currentPath" :tree="files" :path="originalPath" />
</template>

<script setup lang="ts">
import useFileTree from '~/utils/fileTree'

const currentPath = defineModel<string>()
const originalPath = currentPath.value

const files = useFileTree(originalPath)
</script>
