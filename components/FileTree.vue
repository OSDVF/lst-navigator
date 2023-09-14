<template>
    <span v-if="tree?.file" tabindex="0" @click="selectedPath = tree.file.fullPath">
        <img :src="icons?.getVSIFileIcon(tree.file.name)" width="24">
        {{ tree.file.name }}
    </span>
    <details v-else>
        <summary>
            <img :src="icons?.getVSIFolderIcon($props.path ?? 'folder')" width="24">
            {{ p.basename($props.path ?? '') }}
        </summary>
        <ul class="tree">
            <li v-for="(file, fileName) in tree?.directory" :key="fileName">
                <FileTree v-model="selectedPath" :tree="file" :path="p.join($props.path, fileName as string)" />
            </li>
        </ul>
    </details>
</template>

<script setup lang="ts">
import p from 'path'
import type * as FI from 'file-extension-icon-js'
const icons = ref<typeof FI>()

defineProps<{
    tree: FileTree,
    path: string
}>()
const selectedPath = defineModel<string>({ local: true })

onMounted(async () => {
    icons.value = await import('file-extension-icon-js')
})
</script>
