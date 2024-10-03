<template>
    <span
        v-if="tree?.file" tabindex="0" :class="{
            selected: selectedPath === tree.file.fullPath
        }" @click="selectedPath = tree.file.fullPath">
        <Icon :name="imageExtensions.some(e => tree!.file!.name.endsWith(e)) ? 'mdi:image' : 'mdi:file'" />
        {{ tree.file.name }}
    </span>
    <details v-else-if="tree" @toggle="emits('open', path)">
        <summary>
            <Icon name="mdi:folder" />
            {{ p.basename($props.path ?? '') }}
        </summary>
        <ul class="tree">
            <li v-for="(file, fileName) in tree?.directory" :key="fileName">
                <LazyFileTree
                    v-model="selectedPath" :tree="file" :path="p.join(path, fileName as string)"
                    @open="(a: string) => emits('open', a)" />
            </li>
        </ul>
    </details>
</template>

<script setup lang="ts">
import p from 'path'
const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']

defineProps<{
    tree: FileTree | undefined,
    path: string,
}>()
const selectedPath = defineModel<string>()
const emits = defineEmits<{
    open: [string]
}>()
</script>
