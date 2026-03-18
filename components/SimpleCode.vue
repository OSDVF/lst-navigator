<template>
    <PrismEditor v-bind="$attrs" v-model="model" class="mono" :highlight="highlighter" line-numbers :line-nums="true" />
</template>

<script setup lang="ts">
import { PrismEditor } from 'vue-prism-editor'
import 'vue-prism-editor/dist/prismeditor.min.css'

import Prism from 'prismjs'
import 'prismjs/themes/prism-coy.css'

const model = defineModel<string>()
const props = defineProps<{
    language: string,
}>()

function highlighter(code: string) {
    return Prism.highlight(code, Prism.languages[props.language], props.language)
}
</script>

<style>
.prism-editor__container {
    font-family: inherit;
}
</style>