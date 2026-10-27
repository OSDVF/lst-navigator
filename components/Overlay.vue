<template>
    <div id="overlay" v-if="ui.overlayEnabled">
        <LazyClientOnly>
            <div role="dialog" v-if="ui.overlayText">
                <Icon :name="ui.overlayIconName ?? undefined" v-if="ui.overlayIconName" />
                {{ ui.overlayTitleText }}<span>{{ ui.overlayText }}</span>
            </div>
            <vue-easy-lightbox :visible="ui.visibleRef" :imgs="ui.imagesRef" @hide="ui.visibleRef = false" />
        </LazyClientOnly>
    </div>
</template>

<script setup lang="ts">
const ui = useUI()
</script>
