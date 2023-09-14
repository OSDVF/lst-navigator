<template>
    <p v-if="tree">
        <FileTree v-for="(item, name) in tree.directory" :key="name" v-model="currentPath" :tree="item" :path="name" />
    </p>
</template>

<script setup lang="ts">
import useFileTree from '~/utils/fileTree'

const currentPath = defineModel<string>({ local: true })
const base = computed(() => currentPath.value?.substring(0, currentPath.value.indexOf('/')))

const tree = useFileTree(currentPath)
</script>
