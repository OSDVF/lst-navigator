<template>
    <div>
        <Component :is="DataTable" v-bind="$attrs" ref="table" @error="dtError">
            <slot />
        </Component>
        <p v-if="dtErrors" class="flex align-items-start">
            <button @click="dtErrors = ''">
                x
            </button>
            <pre class="m-0">{{ dtErrors }}</pre>
        </p>
    </div>
</template>

<script setup lang="ts" generic="T">
import type { Api } from 'datatables.net'

const table = ref<{ dt: Api<T> }>()
const dt = computed(() => table.value?.dt)

defineExpose({
    dt,
})

const app = useNuxtApp()
const dtErrors = ref('')
function dtError(e: any, settings: any, techNote: string, message: string) {
    console.error(e, settings, techNote, message)
    app.$Sentry.captureException(message, {
        extra: {
            e,
            techNote,
            message,
        },
    })
    dtErrors.value += '\n' + message
}

const DataTable = shallowRef()
watch(dt, (newDt, old) => {
    if (!old) {
        nextTick(() => newDt?.responsive.recalc())
    }
})

onMounted(() => {
    const dtModule = import('datatables.net-vue3')
    const dtCore = import('datatables.net')
    const selectModule = import('datatables.net-select')
    const responsiveModule = import('datatables.net-responsive')
    dtModule.then(async (module) => {
        const $ = await import('jquery')
        const Core = await dtCore
        const Select = await selectModule
        const Responsive = await responsiveModule
        DataTable.value = module.default
        DataTable.value.use(Core.default)
        DataTable.value.use(Select.default)
        DataTable.value.use(Responsive.default)
        if (!import.meta.dev) {
            $.fn.dataTable.ext.errMode = 'none'
        }
    })
})
</script>

<style lang="scss">
@import 'datatables.net-dt';
@import 'datatables.net-select-dt';
@import 'datatables.net-responsive-dt';

.dataTable {
    .icon {
        background: black;
        display: inline-block;
        width: 1.5rem;
        height: 1.5rem;
        mask-repeat: no-repeat;
        mask-size: 100% 100%;
        mask-image: var(--icon);
    }

    &.collapsed {
        .dtr-control {
            white-space: nowrap;

            &::before {
                position: relative;
                top: -6px
            }
        }
    }
}
</style>
