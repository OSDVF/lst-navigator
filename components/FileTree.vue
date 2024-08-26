<template>
    <span
        v-if="tree?.file" tabindex="0" :class="{
            selected: selectedPath === tree.file.fullPath
        }" @click="selectedPath = tree.file.fullPath">
        <img :src="icons?.getVSIFileIcon(tree.file.name)" width="24">
        {{ tree.file.name }}
    </span>
    <details v-else-if="tree" @toggle="emits('open', path)">
        <summary>
            <img :src="icons?.getVSIFolderIcon(path ?? 'folder')" width="24">
            {{ p.basename($props.path ?? '') }}
        </summary>
        <ul class="tree">
            <li v-for="(file, fileName) in tree?.directory" :key="fileName">
                <LazyFileTree
                    v-model="selectedPath" :tree="file" :path="p.join(path, fileName as string)"
                    @open="(a) => emits('open', a)" />
            </li>
        </ul>
    </details>
</template>

<script setup lang="ts">
import p from 'path'
const icons = ref()

defineProps<{
    tree: FileTree | undefined,
    path: string,
}>()
const selectedPath = defineModel<string>()
const emits = defineEmits<{
    open: [string]
}>()

onMounted(async () => {
    try {
        icons.value = await import('file-extension-icon-js')
    } catch {
        console.log('No file extension icons')
    }
})
</script>
