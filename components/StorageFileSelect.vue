<template>
    <p v-if="tree" class="fileTree">
        <LazyFileTree
            v-for="(item, name) in tree.directory" :key="name" v-model="currentPath" :tree="item"
            :path="name.toString()" @open="(p) => useFileTree(p)" />
    </p>
</template>

<script setup lang="ts">
import useFileTree from '~/utils/fileTree'

const currentPath = defineModel<string>()

const tree = computed(() => useFileTree(currentPath.value || '/').value)
</script>

<style lang="scss">
@import '@/assets/styles/constants.scss';

.selected {
    background: rgba($color: $link-background, $alpha: 0.3)
}

.fileTree {
    img {
        vertical-align: middle;

        @media (prefers-color-scheme: dark) {
            filter: invert(1);
        }
    }

    span {
        display: inline-block;
    }

    span,
    summary {
        padding: .3rem 0;
        cursor: pointer;
    }
}
</style>