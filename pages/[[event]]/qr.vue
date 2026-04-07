<template>
    <article>
        <h1>{{ ($route.params.event ? cloud.eventDescription?.title : undefined) ?? $config.public.longName }}</h1>
        <canvas ref="canvas" />
        <p>
            <strong>{{ link }}</strong>
        </p>
        <p v-if="error">
            <code>{{ error }}</code>
        </p>
    </article>
</template>

<script setup lang="ts">
import * as Sentry from '@sentry/nuxt'
import qrcode from 'qrcode'
definePageMeta({
    layout: 'front-page',
    name: 'qr',
})
const route = useRoute()
if (route.params.event) {
    setPageLayout('default')
}
const url = useBrowserLocation()
const link = computed(()=>route.params.event ? `${url.value.origin}/${route.params.event}` : url.value.origin)

const cloud = useCloudStore()
const canvas = ref<HTMLCanvasElement>()
const error = ref()

watchEffect(() => {
    if (canvas.value && link.value) {
        qrcode.toCanvas(canvas.value, link.value, {
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