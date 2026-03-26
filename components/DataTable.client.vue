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
import 'datatables.net-buttons-dt/css/buttons.dataTables.min.css' //CSS
import 'datatables.net-staterestore-dt/css/stateRestore.dataTables.min.css' //CSS

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
    const dt = useNuxtApp().$loadDataTables()
    dtModule.then(async (module) => {
        const $ = await import('jquery')
        module.default.use(await dt)
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

    &.collapsed:not(.compact) {
        .dtr-control {
            white-space: nowrap;

            &::before {
                position: relative;
                top: -6px
            }
        }
    }
}

.dt-button {
    vertical-align: middle;
}

.dt-info {
    margin-bottom: .35rem;
}

.fancy {

    table.dataTable th.dt-right div.dt-column-header,
    table.dataTable th.dt-right div.dt-column-footer,
    table.dataTable td.dt-right div.dt-column-header,
    table.dataTable td.dt-right div.dt-column-footer,
    table.dataTable td.dt-type-numeric div.dt-column-header {
        flex-direction: row;
    }

    tr:not(:last-child) td {
        border-right: 1px solid #7f7f7f19
    }

    @media (max-width: 500px) {

        div.dt-buttons>.dt-button,
        div.dt-buttons>div.dt-button-split .dt-button {
            padding: 0 .3rem;
        }
    }
}
</style>
