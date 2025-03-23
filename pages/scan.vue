<template>
    <video ref="video" playsinline muted class="noinvert" />
</template>

<script setup lang="ts">
import QrScanner from 'qr-scanner'
const video = ref()

let qrScanner: QrScanner | null = null
const router = useRouter()

onMounted(() => {
    if (video.value && router.currentRoute.value.path.includes('scan')) {
        qrScanner = new QrScanner(video.value, result => {
            console.log('Scanned:', result.data)
            if (result.data.startsWith(location.origin)) {
                const path = result.data.substring(location.origin.length)
                console.log('Path:', path)
                router.push(path)
                qrScanner?.destroy()
            }
        }, {
            preferredCamera: 'environment',
            highlightScanRegion: true,
            highlightCodeOutline: true,
        })

        qrScanner.start()
    }
})
</script>

<style>
video {
    max-width: 100%;
    max-height: 100vh;
}
</style>