<template>
    <div
        role="dialog" :class="{
            toast: true, visible: !!cloudStore.networkError,
        //TODO offline alert?
        }" tabindex="0" @click="$alert(cloudStore.networkError?.message)">
        <Icon name="mdi:cloud-off" /> Problém s připojením
    </div>
    <LazyClientOnly>
        <div role="dialog" :class="{ toast: true, visible: isServer || $downloadingUpdate?.value }" tabindex="0">
            <Icon name="mdi:download-multiple" /> Stahování souborů aplikace...
        </div>
    </LazyClientOnly>
</template>

<script lang="ts" setup>
const cloudStore = useCloudStore()
const isServer = ref(import.meta.server)
</script>