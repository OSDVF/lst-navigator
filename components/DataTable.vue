<template>
    <div>
        <ClientOnly>
            <Component :is="DataTable" v-bind="$attrs" ref="table" @error="dtError">
                <slot />
            </Component>
        </ClientOnly>
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
    dt
})

const app = useNuxtApp()
const dtErrors = ref('')
function dtError(e: any, settings: any, techNote: string, message: string) {
    console.error(e, settings, techNote, message)
    app.$Sentry.captureException(message, {
        extra: {
            e,
            techNote,
            message
        }
    })
    dtErrors.value += '\n' + message
}

const DataTable = shallowRef()
onMounted(() => {
    const dtModule = import('datatables.net-vue3')
    const selectModule = import('datatables.net-select')
    const responsiveModule = import('datatables.net-responsive')
    dtModule.then(async (module) => {
        const $ = await import('jquery')
        const Select = await selectModule
        const Responsive = await responsiveModule
        DataTable.value = module.default
        DataTable.value.use(Select.default)
        DataTable.value.use(Responsive.default)
        $.fn.dataTable.ext.errMode = 'none'
    })
})
</script>

<style lang="scss">
@import 'datatables.net-dt';
@import 'datatables.net-select-dt';
@import 'datatables.net-responsive-dt';

.datatable {
    .icon {
        background: black;
        display: inline-block;
        width: 1.5rem;
        height: 1.5rem;
        mask-repeat: no-repeat;
        mask-size: 100% 100%;
        ;
    }
}
</style>
