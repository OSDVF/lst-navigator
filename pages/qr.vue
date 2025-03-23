<template>
    <article>
        <h1>{{ cloud.eventData?.title }}</h1>
        <canvas ref="canvas" />
        <p>
            <strong>{{ url.origin }}</strong>
        </p>
        <p v-if="error">
            <code>{{ error }}</code>
        </p>
    </article>
</template>

<script setup lang="ts">
import * as Sentry from '@sentry/nuxt'
import qrcode from 'qrcode'
const cloud = useCloudStore()
const url = useBrowserLocation()
const canvas = ref<HTMLCanvasElement>()
const error = ref()

watchEffect(() => {
    if (canvas.value && url.value.origin) {
        qrcode.toCanvas(canvas.value, url.value.origin, {
            errorCorrectionLevel: 'H',
            width: 300,
        }, function (e) {
            if (e) {
                Sentry.captureException(e)
                error.value = e
                console.error(e)
            }
        })
    }
})
</script>