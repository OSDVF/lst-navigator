<template>
    <canvas
        ref="canvas"
        class="signature-canvas"
        @pointerdown="startDrawing"
        @pointermove="draw"
        @pointerup="stopDrawing"
        @pointercancel="stopDrawing"
    ></canvas>
</template>

<script lang="ts" setup>
const props = withDefaults(defineProps<{
    color?: string
    lineWidth?: number
}>(), {
    color: '#000000',
    lineWidth: 3,
})

const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
let context: CanvasRenderingContext2D | undefined
let isDrawing = false
let lastX = 0
let lastY = 0

let xMin = Infinity
let xMax = -Infinity
let yMin = Infinity
let yMax = -Infinity

function setupContext() {
    if (!context || !canvas.value) return
    context.strokeStyle = props.color
    context.lineWidth = props.lineWidth
    context.lineCap = 'round'
    context.lineJoin = 'round'
}

function updateBounds(x: number, y: number) {
    if (!canvas.value) return
    const pad = Math.ceil(props.lineWidth / 2) + 2
    xMin = Math.max(0, Math.min(xMin, Math.floor(x - pad)))
    xMax = Math.min(canvas.value.width, Math.max(xMax, Math.ceil(x + pad)))
    yMin = Math.max(0, Math.min(yMin, Math.floor(y - pad)))
    yMax = Math.min(canvas.value.height, Math.max(yMax, Math.ceil(y + pad)))
}

function resizeCanvas() {
    if (!canvas.value) return
    const rect = canvas.value.getBoundingClientRect()
    const width = Math.floor(rect.width) || 300
    const height = Math.floor(rect.height) || 150

    if (canvas.value.width !== width || canvas.value.height !== height) {
        // Save existing image content if user had drawn something
        let savedImage: ImageData | undefined
        if (context && xMin < xMax && yMin < yMax) {
            try {
                savedImage = context.getImageData(0, 0, canvas.value.width, canvas.value.height)
            } catch {
                // Ignore if canvas was empty or invalid
            }
        }

        canvas.value.width = width
        canvas.value.height = height
        setupContext()

        if (savedImage && context) {
            context.putImageData(savedImage, 0, 0)
        }
    }
}

let resizeObserver: ResizeObserver | undefined

onMounted(() => {
    if (!canvas.value) return
    context = canvas.value.getContext('2d') ?? undefined
    resizeCanvas()

    if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => resizeCanvas())
        resizeObserver.observe(canvas.value)
    }
})

onUnmounted(() => {
    resizeObserver?.disconnect()
})

watch(() => [props.color, props.lineWidth], () => {
    setupContext()
})

function getCanvasCoords(event: PointerEvent) {
    if (!canvas.value) return { x: 0, y: 0 }
    const rect = canvas.value.getBoundingClientRect()
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
    }
}

function startDrawing(event: PointerEvent) {
    if (!canvas.value || !context) return
    canvas.value.setPointerCapture(event.pointerId)
    isDrawing = true
    const { x, y } = getCanvasCoords(event)
    lastX = x
    lastY = y

    // Draw a single dot on initial tap/click
    context.beginPath()
    context.arc(x, y, props.lineWidth / 2, 0, Math.PI * 2)
    context.fillStyle = props.color
    context.fill()
    setupContext()

    updateBounds(x, y)
}

function draw(event: PointerEvent) {
    if (!isDrawing || !context) return
    const { x, y } = getCanvasCoords(event)

    context.beginPath()
    context.moveTo(lastX, lastY)
    context.lineTo(x, y)
    context.stroke()

    updateBounds(lastX, lastY)
    updateBounds(x, y)

    lastX = x
    lastY = y
}

function stopDrawing(event: PointerEvent) {
    if (!isDrawing || !canvas.value) return
    isDrawing = false
    try {
        canvas.value.releasePointerCapture(event.pointerId)
    } catch {
        // Ignore if pointer capture was already released
    }
}

function clear() {
    if (!canvas.value || !context) return
    context.clearRect(0, 0, canvas.value.width, canvas.value.height)
    xMin = Infinity
    xMax = -Infinity
    yMin = Infinity
    yMax = -Infinity
}

function getImage(): ImageData | undefined {
    if (!context || !canvas.value || xMin >= xMax || yMin >= yMax) {
        return undefined
    }
    const width = xMax - xMin
    const height = yMax - yMin
    return context.getImageData(xMin, yMin, width, height)
}

defineExpose({
    getImage,
    clear,
})
</script>

<style scoped>
.signature-canvas {
    touch-action: none;
    user-select: none;
    display: block;
    width: 100%;
    height: 100%;
}
</style>
