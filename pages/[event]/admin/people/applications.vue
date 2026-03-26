<template>
    <div>
        <ProgressBar v-if="applications.loadingApplications" />
        <DataTable
            v-else-if="showTable" ref="table" class="display compact fancy" :options="{
                deferRender: true,
                responsive, colReorder: true, buttons: true, stateRestore: true, scroller: true, scrollCollapse: true, keys: true,
                columnControl: [
                    'order',
                    [
                        'searchDropdown',
                        'spacer',
                        { extend: 'colVisDropdown', columns: ':not(.always-visible)' },
                        'showAll'
                    ]
                ],
                layout: {
                    topStart: {
                        buttons: [
                            {
                                extend: 'savedStates',
                                text: 'Zobrazení',
                                buttons: [
                                    { extend: 'createState', text: 'Uložit zobrazení' },
                                    { extend: 'removeAllStates', text: 'Smazat uložená zobrazení' },
                                    { extend: 'spacer', style: 'bar' }
                                ]
                            }, {
                                extend: 'collection',
                                text: 'Akce',
                                className: 'selected-only disabled',
                                buttons: [
                                    {
                                        text: useIconEl('edit') + ' Upravit',
                                        action: openEditLink
                                    }, {
                                        text: useIconEl('cancel') + ' Zrušit',
                                        action() {
                                            const id = selection?.[0].id
                                            if (!id) {
                                                return
                                            }
                                            setDocT(doc(knownCollection(firestore, 'applications'), cloud.selectedEvent, 'responses', id), {
                                                state: ApplicationState.CANCELLED,
                                            } as Application, { merge: true })
                                        }
                                    }
                                ],
                            }, {
                                extend: 'collection',
                                text: 'Ubytovací list',
                                autoClose: true,
                                buttons: [
                                    {
                                        text: 'Vybrat výchozí sloupce',
                                        action(_: any, dt: Api<any>) {
                                            dt.columns('.print').visible(true)
                                            dt.columns(':not(.print, .always-visible)').visible(false)
                                        }
                                    }, {
                                        text: 'Zobrazit všechny sloupce',
                                        action: (_: any, dt: Api<any>) => dt.columns().visible(true),
                                    }, {
                                        extend: 'print',
                                        autoPrint: false,
                                        text: '🖨️ Tisk',
                                        title: '',
                                        exportOptions: {
                                            columns: ':visible:not(.always-visible)',
                                        },
                                    }
                                ]
                            }, {
                                extend: 'collection',
                                text: '<span class=\'noinvert\'>🗒️</span> Data formuláře',
                                autoClose: true,
                                buttons: [
                                    {
                                        text: useIconEl('cog-refresh') + ' Aktualizovat data z formuláře',
                                        titleAttr: 'Stáhne všechny odeslané přihlášky a jejich změny do interní databáze',
                                        action: refresh,
                                    }, ...questionControlColumns
                                ]
                            }
                        ],
                        info: {
                            empty: 'Nic',
                            callback(_: any, start: number, end: number, _max: number, total: number, _pre: any) {
                                return `Položky ${start} až ${end} z ${total}`
                            },
                        }
                    },
                    topEnd: {
                        search: {
                            text: '',
                            processing: true,
                            placeholder: 'Hledat'
                        },
                        buttons: [{
                            extend: 'ccSearchClear',
                            text: useIconEl('filter-off', 'Zrušit filtrování')
                        }]
                    },
                    bottomStart: null,
                },
                ordering: {
                    indicators: false,
                    handler: false
                },
                select: {
                    style: 'os',
                },
                scrollY: scrollY as any,
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
                    title: typeof val == 'number' ? availableQuestions[val]?.title ?? val : val,
                    columnControl: ((typeof val == 'number' ? availableQuestions[val] : Object.values(availableQuestions).find(a => a.title == val))?.values.size ?? 0) < 5 ? searchList : undefined,
                })),
                { data: null, title: 'Celkem', render: (row: typeof data[0]) => (row.paid + row.remaining) || '', visible: false, className: 'print' },
                { data: 'paid', title: 'Převodem', render: (data) => data || '', className: 'print' },
                { data: 'remaining', title: 'Zbývá', render: (data) => data || '', className: 'print' },
                {
                    data: 'confirmationSent', title: '📧', render: (data: boolean) => data ? '✔' : '<span class=\'muted\' title=\'Neodeslán\'>❌</span>',
                    columnControl: searchList,
                    visible: false,
                },
                {
                    data: 'state', title: 'Stav', render: (data: ApplicationState) => ({
                        [ApplicationState.NEW]: 'Nová',
                        [ApplicationState.CANCELLED]: 'Zrušená',
                        [ApplicationState.CONFIRMED]: 'Přijatá',
                        [ApplicationState.REJECTED]: 'Odmítnutá'
                    }[data]),
                    visible: false,
                    columnControl: searchList,
                },
                {
                    data: 'editTimestamp', title: 'Upraveno', render: (data: number) => new Date(data).toLocaleString(),
                    visible: false,
                },
                { data: 'edits', title: 'Počet úprav', visible: false, },
                { data: null, title: 'Podpis', render: () => '', className: 'print', visible: false, }
            ] as Columns).map(c => ({ render: ellipsis, ...c }))" @select="selectionChanged"
            @deselect="selectionChanged" />
        <Teleport v-if="!!table?.dt" to=".dt-buttons">
            <label class="nowrap ml-1"><input v-model="responsive" type="checkbox"> Rozbalovací řádky</label>
        </Teleport>

        <p v-if="refreshResult.ok" class="mb-5">
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
import { ApplicationState, SpecialApplicationFields, type Application } from '~/types/cloud'
import mapValues from 'lodash.mapvalues'
import { deleteField, doc, updateDoc } from 'firebase/firestore'
import { setDoc as setDocT } from '~/utils/trace'

type Columns = ({ data: keyof typeof data.value[0], title: string } & ConfigColumns)[]

definePageMeta({
    title: 'Přijaté přihlášky',
})

const app = useNuxtApp()
const applications = useApplications()
const api = useApplicationForm()
const cloud = useCloudStore()
const firestore = useFirestore()
const ui = useUI()
const windowSize = useWindowSize()
const responsive = useLocalStorage('responsive', false)
const showTable = ref(true)
const navigation = inject<Ref<HTMLDivElement | null>>('navigation')
const navigationSize = useElementSize(navigation, undefined, { box: 'border-box' })
const layoutRowHeight = ref(30)
const scrollY = computed(() => (windowSize.height.value - navigationSize.height.value - layoutRowHeight.value - 120))

const availableQuestions = computed(() => {
    const result: Record<number, { title: string, values: Set<string> }> = {}
    for (const a of applications.filtered) {
        for (const q of a.questions) {
            if (q.id in result) {
                result[q.id].values.add(q.responses?.toString())
                continue
            }
            result[q.id] = { title: q.title, values: new Set<string>([q.responses?.toString()]) }
        }
    }
    return result
})
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
watch([() => table.value?.dt, scrollY], () => {
    const layoutRow = document.querySelector('.dt-layout-row')
    const scrollBody = document.querySelector('.dt-scroll-body') as HTMLDivElement
    if (layoutRow && scrollBody) {
        layoutRowHeight.value = layoutRow.scrollHeight
        scrollBody.style.maxHeight = `${scrollY.value}px`
    }
})
async function reload<T>(between?: () => PromiseLike<T>) {
    showTable.value = false
    if (between) {
        await between()
    }
    nextTick(() => showTable.value = true)
}

const selection = ref<Exclude<typeof table.value, null>['dt']>()
function selectionChanged() {
    if (table.value) {
        selection.value = table.value.dt.rows({ selected: true }).data()
        if (selection.value.length) {
            $('.selected-only').removeClass('disabled')
        } else {
            $('.selected-only').addClass('disabled')
        }
    }
}
function openEditLink() {
    const link = selection.value?.[0].editLink
    if (link) {
        window.open(link, '_blank', 'noopener,noreferrer')
    }
}

const ellipsis = computed(() => app.$DataTable.value?.render.ellipsis(20) ?? ((data: any) => data))
const date = computed(() => app.$DataTable.value?.render.date() ?? ((response: string) => toJSDate(response)?.toLocaleDateString() ?? response))
const complexColumns = computed(() => [
    {
        data: 'index',
        title: '#',
        className: 'print',
        columnControl: [
            [
                'order',
                'searchDropdown',
                'spacer',
                { extend: 'colVisDropdown', columns: ':not(.always-visible)' },
                'showAll',
            ],
        ],
    },
    {
        data: 'email',
        title: 'E-mail',
        className: 'print',
    },
    {
        data: 'name',
        title: 'Jméno a příjmení',
        render: ellipsis.value,
        className: 'print',
    }, {
        data: 'arrival',
        title: 'Příjezd',
        render: date.value,
        className: 'print',
    },
    {
        data: 'departure',
        title: 'Odjezd',
        render: date.value,
        className: 'print',
    },
])

const questionControlColumns = computed(() => {
    const toAdd = Object.keys(availableQuestions.value).filter((a: any) => !Object.values(applications.settings?.fields ?? {}).some(f => typeof f == 'number' && f == a || f == availableQuestions.value[a].title))
    const toRemove = Object.keys(availableQuestions.value).filter((a: any) => Object.entries(applications.settings?.fields ?? {}).some(([k, v]) => (typeof v == 'number' && v == a) || (v == availableQuestions.value[a].title && !SpecialApplicationFields.includes(k as any))))
    return [
        {
            text: useIconEl('add') + ' Přidat otázku jako sloupec',
            extend: 'collection',
            buttons: toAdd.length ? [{
                text: useIconEl('check-all') + ' Všechny',
                action() {
                    updateDoc(doc(firestore, `applications/${cloud.selectedEvent}`),
                        Object.fromEntries(toAdd.map(k => ([
                            `fields.${availableQuestions.value[k as any].title}`, parseInt(k),
                        ])))).then(() => reload())
                },
            }].concat(toAdd.map((id: any) => ({
                text: availableQuestions.value[id].title,
                action() {
                    updateDoc(doc(firestore, `applications/${cloud.selectedEvent}`), {
                        [`fields.${availableQuestions.value[id].title}`]: parseInt(id),
                    }).then(() => reload())
                },
            }))) : [{
                text: '&ensp;V tabulce jsou již všechny otázky z přihlášky&ensp;',
                extend: 'spacer',
                style: 'empty',
            }],
        }, {
            text: useIconEl('remove') + ' Odebrat sloupec',
            titleAttr: 'Odebere natrvalo sloupec pro všechny uživatele',
            extend: 'collection',
            buttons: toRemove.length ? [{
                text: useIconEl('remove') + ' Všechny',
                action() {
                    reload(() => updateDoc(doc(firestore, `applications/${cloud.selectedEvent}`),
                        Object.fromEntries(toRemove.map(k => ([
                            `fields.${availableQuestions.value[k as any].title}`, deleteField(),
                        ])))))
                },
            }].concat(toRemove.map((id: any) => ({
                text: availableQuestions.value[id].title,
                action() {
                    const entry = Object.entries(applications.settings?.fields ?? {}).find(([_, v]) => typeof v == 'number' && v == parseInt(id) || v == availableQuestions.value[id].title)
                    reload(() => updateDoc(doc(firestore, `applications/${cloud.selectedEvent}`), {
                        [`fields.${entry?.[0] ?? availableQuestions.value[id].title}`]: deleteField(),
                    }))
                },
            }))) : [
                {
                    text: '&ensp;Zatím žádné dodatečné sloupce nebyly přidány&ensp;',
                    extend: 'spacer',
                    style: 'empty',
                },
            ],
        },
    ]
})
watch([responsive, complexColumns, questionControlColumns], () => reload())
const searchList = [
    [
        'order',
        'searchList',
        'spacer',
        { extend: 'colVisDropdown', columns: ':not(.always-visible)' },
        'showAll',
    ],
]

</script>