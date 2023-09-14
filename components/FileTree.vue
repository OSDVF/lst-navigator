<template>
    <details>
        <summary>
            <img :src="getVSIFolderIcon($props.path ?? 'folder')" width="24">
            {{ $props.path }}
        </summary>
        <ul class="tree">
            <li v-for="(file, fileName) in tree?.directory" :key="fileName">
                <button v-if="file?.file" @click="selectedPath = p.join($props.path, fileName as string)">
                    <img :src="getVSIFileIcon(fileName as string)" width="24">
                    {{ fileName }}
                </button>
                <FileTree v-else v-model="selectedPath" :tree="file" :path="p.join($props.path, fileName as string)" />
            </li>
        </ul>
    </details>
</template>

<script setup lang="ts">
import p from 'path'
import { getVSIFolderIcon, getVSIFileIcon } from 'file-extension-icon-js'

defineProps<{
    tree: FileTree,
    path: string
}>()
const selectedPath = defineModel<string>()
</script>
