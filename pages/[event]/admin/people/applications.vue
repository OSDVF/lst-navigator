<template>
    <div>
        <ProgressBar v-if="applications.loadingApplications" />
        <LazyDataTable
            v-else ref="table" class="display compact fancy" :options="{
                deferRender: true,
                responsive, colReorder: true, buttons: true, stateRestore: true, scroller: true, scrollCollapse: true, keys: true,
                columnControl: [
                    'order',
                    [
                        'searchDropdown',
                        'spacer',
                        { extend: 'colVisDropdown', columns: ':not(.always-visible)' },
                    ]
                ],
                layout: {
                    topStart: {
                        buttons: [{
                            extend: 'savedStates',
                            buttons: [
                                'createState',
                                'removeAllStates',
                                { extend: 'spacer', style: 'bar' }
                            ]
                        }, 'ccSearchClear'
                        ],
                    }
                },
                ordering: {
                    indicators: false,
                    handler: false
                },
                select: {
                    style: 'os',
                    selector: 'td:first-child'
                },
                scrollY: (windowSize.height.value - 400) as any,
            }" :data="data" :columns="([
                {
                    data: null,
                    columnControl: [],
                    className: 'always-visible',
                    render: $DataTable.value?.render.select(),
                },
                ...complexColumns,
                ...Object.entries(applications.settings?.fields ?? {}).filter(k => !complexColumns.find(c => c.data == k[0])).map(([key, val]) => ({
                    data: key,
                    title: val,
                })),
                { data: 'editTimestamp', title: 'Upraveno', render: (data: number) => new Date(data).toLocaleString() },
                { data: 'edits', title: 'Počet úprav' },
                {
                    data: 'confirmationSent', title: '📧', render: (data: boolean) => data ? '✔' : '<span class=\'muted\' title=\'Neodeslán\'>❌</span>',
                    columnControl: [
                        [
                            'order',
                            'searchDropdown',
                            'spacer',
                            { extend: 'colVisDropdown', columns: ':not(.always-visible)' },
                        ]
                    ],
                },
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
            ] as Columns).map(c => ({ render: ellipsis, ...c }))" />
        <button type="button" @click="refresh">
            <Icon name="mdi:cog-refresh" /> &nbsp;
            Aktualizovat data z formuláře
        </button>

        <label><input v-model="responsive" type="checkbox"> Rozbalovací řádky</label>
        <button v-if="reloadPage" @click="reload">Pro použití znovu načtěte stránku</button>

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
import type { Api, ConfigColumns } from 'datatables.net-dt'
import type { ApiResponse, Responses } from '~/form-connector/src/api'
import { ApplicationState } from '~/types/cloud'
import mapValues from 'lodash.mapvalues'

type Columns = ({ data: keyof typeof data.value[0], title: string } & ConfigColumns)[]

definePageMeta({
    title: 'Přijaté přihlášky',
})

const app = useNuxtApp()
const applications = useApplications()
const api = useApplicationForm()
const cloud = useCloudStore()
const ui = useUI()
const windowSize = useWindowSize()
const responsive = useLocalStorage('responsive', true)
const reloadPage = ref(false)

const refreshResult = ref<ApiResponse<Responses['refreshResponses']>>({
    ok: false,
})
const table = useTemplateRef<{ dt: Api<typeof data.value> }>('table')

const data = computed(() => applications.filteredMapped.toSorted((a, b) => a.record.timestamp - b.record.timestamp).map((a, i) => ({
    index: i,
    paid: 0,
    remaining: 0,
    confirmationSent: false,
    state: ApplicationState.NEW,
    ...mapValues(applications.settings?.fields, () => null),//blank values
    ...Object.fromEntries(Object.keys(a.mapped ?? {}).filter(k => typeof k == 'string').map(k => [k, a.mapped![k]?.responses.toString() ?? null])),
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
watch(responsive, () => {
    reloadPage.value = true
})
function reload() {
    location.reload()
}
const ellipsis = computed(() => app.$DataTable.value?.render.ellipsis(20) ?? ((data: any) => data))
const date = computed(() => app.$DataTable.value?.render.date() ?? ((response: string) => toJSDate(response)?.toLocaleDateString() ?? response))
const complexColumns = computed(() => [
    {
        data: 'index',
        title: '#',
        columnControl: [
            [
                'order',
                'searchDropdown',
                'spacer',
                { extend: 'colVisDropdown', columns: ':not(.always-visible)' },
            ],
        ],
    },
    {
        data: 'email',
        title: 'E-mail',
    },
    {
        data: 'name',
        title: 'Jméno',
        render: ellipsis.value,
    }, {
        data: 'arrival',
        title: 'Příjezd',
        render: date.value,
    },
    {
        data: 'departure',
        title: 'Odjezd',
        render: date.value,
    },
])

</script>