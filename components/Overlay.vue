<template>
    <div v-if="ui.overlayEnabled" id="overlay">
        <LazyClientOnly>
            <div v-if="ui.overlayText" role="dialog">
                <Icon v-if="ui.overlayIconName" :name="ui.overlayIconName ?? undefined" />
                {{ ui.overlayTitleText }}<span>{{ ui.overlayText }}</span>
            </div>
            <vue-easy-lightbox :visible="ui.visibleRef" :imgs="ui.imagesRef" @hide="ui.visibleRef = false" />
        </LazyClientOnly>
    </div>
</template>

<script setup lang="ts">
const ui = useUI()
</script>
