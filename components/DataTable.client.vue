<template>
    <div>
        <Component
            :is="DataTable" v-bind="$attrs" ref="table" :ajax="ajax" :columns="columns" :data="data"
            :options="options" @error="dtError">
            <slot />
        </Component>
        <p v-if="dtErrors" class="flex align-items-start">
            <button @click="dtErrors = ''">
                x
            </button>
            <code>{{ dtErrors }}</code>
        </p>
    </div>
</template>

<script setup lang="ts" generic="T">
import type { Api, Config, ConfigColumns } from 'datatables.net'
import * as Sentry from '@sentry/nuxt'

import 'datatables.net-dt/css/dataTables.dataTables.min.css' //CSS
import 'datatables.net-select-dt/css/select.dataTables.min.css' //CSS
import 'datatables.net-responsive-dt/css/responsive.dataTables.min.css' //CSS

const table = ref<{ dt: Api<T> }>()
const dt = computed(() => table.value?.dt)

defineExpose({
    dt,
})

defineProps<{
    /**
    * Load data for the table's content from an Ajax source
    */
    ajax?: Config['ajax'];
    /**
    * Set column specific initialisation properties.
    */
    columns?: ConfigColumns[] | undefined;
    /**
    * Data to use as the display data for the table.
    */
    data?: T;
    /**
    * DataTables options
    */
    options?: Config | undefined;
}>()


const dtErrors = ref('')
function dtError(e: any, settings: any, techNote: string, message: string) {
    console.error(e, settings, techNote, message)
    if (process.env.SENTRY_DISABLED !== 'true') {
        Sentry.captureException(message, {
            extra: {
                e,
                techNote,
                message,
            },
        })
    }
    dtErrors.value += '\n' + message
}

const DataTable = shallowRef()
watch(dt, (newDt, old) => {
    if (!old) {
        nextTick(() => newDt?.responsive.recalc())
    }
    newDt?.on('page', () => nextTick(() => newDt?.responsive.recalc()))
}, { immediate: true })

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
        module.default.use(Core.default)
        module.default.use(Select.default)
        module.default.use(Responsive.default)
        DataTable.value = module.default
        if (!import.meta.dev) {
            $.fn.dataTable.ext.errMode = 'none'
        }
    })
})
</script>

<style lang="scss">
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
