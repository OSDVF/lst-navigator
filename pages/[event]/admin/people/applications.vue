<template>
    <div>
        <ProgressBar v-if="applications.loadingApplications" />
        <LazyDataTable
            v-else ref="table" :options="{ paging: false, responsive: true, select: true }" :data="data" :columns="[
                ...complexColumns,
                ...Object.entries(applications.settings?.fields ?? {}).filter(k => !complexColumns.find(c => c.data == k[0])).map(([key, val]) => ({
                    data: key,
                    title: val,
                    render: responseRender
                })),
                { data: 'editTimestamp', title: 'Upraveno', render: (data: number) => new Date(data).toLocaleString() },
                { data: 'edits', title: 'Počet úprav' },
                { data: 'confirmationSent', title: '📧', render: (data: boolean) => data ? '✔' : '' },
                {
                    data: 'state', title: 'Stav', render: (data: ApplicationState) => ({
                        [ApplicationState.NEW]: 'Nová',
                        [ApplicationState.CANCELLED]: 'Zrušená',
                        [ApplicationState.CONFIRMED]: 'Přijatá',
                        [ApplicationState.REJECTED]: 'Odmítnutá'
                    }[data])
                },
                { data: 'paid', title: 'Zaplaceno' },
                { data: 'remaining', title: 'Zbývá' },
            ] as Columns" />
        <button type="button" @click="refresh">
            <Icon name="mdi:cog-refresh" /> &nbsp;
            Aktualizovat data z formuláře
        </button>

        <p v-if="refreshResult.ok">
            <template v-if="refreshResult.data">
                Nové přihlášky: {{ refreshResult.data.new }} <br>
                Změněné přihlášky: {{ refreshResult.data.changed }}
            </template>
            <template v-else>
                Nová data se nepodařilo stáhnout
            </template>
        </p>
        <p v-else-if="refreshResult.error" class="error">
            <code>{{ refreshResult.error?.message || refreshResult.error?.code || refreshResult.error?.http }}</code>
        </p>
    </div>
</template>

<script lang="ts" setup>
import type { Api } from 'datatables.net-dt'
import type { ApiResponse, Responses } from '~/form-connector/src/api'
import type { QuestionResponse } from '~/form-connector/src/responses'
import { ApplicationState } from '~/types/cloud'
import mapValues from 'lodash.mapvalues'

type Columns = { data: keyof typeof data.value[0], title: string, render?: (data: any) => string }[]

definePageMeta({
    title: 'Přijaté přihlášky',
})

const applications = useApplications()
const api = useApplicationForm()
const cloud = useCloudStore()
const ui = useUI()

const refreshResult = ref<ApiResponse<Responses['refreshResponses']>>({
    ok: false,
})
const table = useTemplateRef<{ dt: Api<typeof data.value> }>('table')
const complexColumns: Columns = [
    {
        data: 'email',
        title: 'E-mail',
    },
    {
        data: 'name',
        title: 'Jméno',
        render: responseRender,
    }, {
        data: 'arrival',
        title: 'Příjezd',
        render: dateRender,
    },
    {
        data: 'departure',
        title: 'Odjezd',
        render: dateRender,
    },
]

const data = computed(() => applications.filteredMapped.map(a => ({
    paid: 0,
    remaining: 0,
    confirmationSent: false,
    state: ApplicationState.NEW,
    ...mapValues(applications.settings?.fields, () => ({})),
    ...Object.fromEntries(Object.keys(a.mapped ?? {}).filter(k => typeof k == 'string').map(k => [k, a.mapped![k] ?? {
        responses: '',
    }])),
    ...a.record,
})))

async function refresh() {
    if (!cloud.eventDescription?.formDocument) {
        alert('Událost nemá nastavenou URL přihlášky')
        return
    }

    using _ = ui.loading()
    const formId = extractFormIdFromURL(cloud.eventDescription.formDocument)
    if (!formId) {
        alert('URL přihlášky není ve správném formátu')
        return
    }

    refreshResult.value = await api.refreshResponses(formId, true)
    table.value?.dt?.draw()
    table.value?.dt?.responsive.recalc()
}
watch(() => applications.loadingApplications, l => {
    if (!l) {
        table.value?.dt?.responsive.recalc()
    }
}, { immediate: true })
onMounted(() => table.value?.dt?.responsive.recalc())

function responseRender(response: QuestionResponse) {
    return response.responses?.toString()
}

function dateRender(response: QuestionResponse) {
    return toJSDate(response.responses?.toString())?.toLocaleDateString() ?? ''
}

</script>