<template>
    <div>
        <ProgressBar v-if="applications.loadingApplications" />
        <LazyDataTable
            v-else-if="showTable" ref="table" class="display compact fancy" :options="{
                deferRender: true,
                responsive, colReorder: true, stateRestore: true, scroller: true, scrollCollapse: true, keys: true,
                columnControl: columnControl,
                initComplete,
                createdRow(this: { api(): Exclude<typeof table, null>['dt'] }, row: HTMLTableRowElement, d: typeof data[number], _i: number, cells: HTMLTableCellElement[]) {
                    row.classList.add(ApplicationStateUI[d.state].class)

                    if (!isEmpty(d.overlays)) {
                        // eslint-disable-next-line vue/this-in-template
                        Object.keys(d.overlays).map(o => maybe(maybeIndex(this.api().columns().dataSrc().indexOf(o)), i => {
                            cells[i].classList.add('overlayed')
                            cells[i].title ||= 'Hodnota upravena pro zobrazení. Původní hodnota: ' + d.original?.[o as keyof typeof d.original]
                        }
                        ))
                    }
                    cells.map(c => c.title ||= `${ApplicationStateUI[d.state].name} přihláška`)//cannot use for because Vue cripples local variables
                },
                layout: {
                    topStart: {
                        buttons: windowSize.width.value >= 700 ? buttons : undefined,
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
                    items: editMode ? 'cell' : 'row',
                    keys: true,
                },
                scrollY: scrollY as any,
            }" :data="data" :columns="columns" @select="selectionChanged" @deselect="selectionChanged" />
        <Teleport v-if="mounted" to="#topNav">
            <div ref="dtButtons" class="dtButtons">
                <label
                    title="Přepne tabulku do módu, kdy můžete upravovat kolonky, ale reálná data z přihlášek zůstanou uložená původní"
                    :class="'ml-1 inline-block' + (editMode ? ' strong' : '')"><input
                        v-model="editMode"
                        type="checkbox">
                    Mód úprav</label>
                <label class="ml-1 inline-block"><input v-model="applications.includeCancelled" type="checkbox">
                    Zobrazit i zrušené</label>
                <label class="ml-1 inline-block"><input v-model="responsive" type="checkbox">
                    Rozbalovací řádky</label>
                <label class="ml-1 inline-block"><input v-model="expandMultiple" type="checkbox">
                    Zaškrtávací políčka zvlášť</label>
                <label class="ml-1 inline-block"><input v-model="czechDates" type="checkbox">
                    České datumy</label>
            </div>
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
import type { Api, ApiButton, ApiCellsMethods, ApiRowsMethods, ButtonConfig, ConfigColumns } from 'datatables.net-dt'
import type { ApiResponse, Responses } from '~/form-connector/src/api'
import { type ResponseRecord, ApplicationState } from '~/form-connector/src/responses'
import { SpecialApplicationFields } from '~/types/cloud'
import { deleteField, doc, updateDoc } from 'firebase/firestore'
import { setDoc as setDocT } from '~/utils/trace'
import mapValues from 'lodash.mapvalues'
import isEmpty from 'lodash.isempty'
import isMatchWith from 'lodash.ismatchwith'

declare module 'datatables.net' {
    interface ApiButtonMethods<T> extends Omit<Api<T>, 'trigger'> {
        collectionRebuild(config: ButtonConfig[]): ApiButtons<T>
    }
}

definePageMeta({
    title: 'Přijaté přihlášky',
})

const mounted = ref(false)
onMounted(() => mounted.value = true)
const app = useNuxtApp()
const applications = useApplications()
const api = useApplicationForm()
const cloud = useCloudStore()
const dtButtons = useTemplateRef<HTMLDivElement>('dtButtons')
const firestore = useFirestore()
const keyboardVisible = inject<Ref<boolean>>('keyboardVisible')
const ui = useUI()
const windowSize = useWindowSize()
const responsive = useLocalStorage('responsive', false)
const expandMultiple = useLocalStorage('expandMultiple', true)
const czechDates = useLocalStorage('czechDates', false)
const editMode = useLocalStorage('editMode', false)
const showTable = ref(false)
const navigation = inject<Ref<HTMLDivElement | null>>('navigation')
const navigationSize = useElementSize(navigation, undefined, { box: 'border-box' })
const layoutRowHeight = ref(30)
const scrollY = computed(() => (windowSize.height.value - navigationSize.height.value - layoutRowHeight.value - 120))

const columnControl = computed(() => windowSize.width.value > 700 ? [
    'order',
    [
        { extend: 'searchDropdown', text: 'Hledat' },
        'spacer',
        { extend: 'colVisDropdown', text: 'Sloupce', columns: ':not(.always-visible)' },
        'showAll',
    ],
] : undefined)

const availableQuestions = computed(() => {
    const result: Record<number, { title: string, values: Set<string>, multi: boolean, }> = {}
    for (const a of applications.filtered) {
        for (const q of a.questions) {
            if (q.id in result) {
                if (Array.isArray(q.responses)) {
                    result[q.id].multi = true
                    if (expandMultiple.value) {
                        q.responses.map(r => result[q.id].values.add(r?.toString()))
                        continue
                    }
                }
                result[q.id].values.add(q.responses?.toString())
                continue
            }
            result[q.id] = {
                title: q.title,
                values: new Set<string>([...((Array.isArray(q.responses) && expandMultiple.value)
                    ? q.responses.map(r => r?.toString()) :
                    [q.responses?.toString()])]),
                multi: Array.isArray(q.responses),
            }
        }
    }
    return result
})
const refreshResult = ref<ApiResponse<Responses['refreshResponses']>>({
    ok: false,
})
const table = useTemplateRef<{ dt: Api<typeof data.value> }>('table')
const data = computed(() => applications.filteredMapped.toSorted((a, b) => a.record.timestamp - b.record.timestamp)
    .filter(a => applications.includeCancelled ? true : ![ApplicationState.CANCELLED, ApplicationState.REJECTED].includes(a.record.state ?? ApplicationState.NEW))
    .map((a, i) => {
        const mappedTitles = Object.keys(a.mapped ?? {}).filter(k => typeof k == 'string')
        const mappedEntries: [string, string | string[] | boolean | null][] = []
        for (const t of mappedTitles) {
            const responses = a.mapped![t]?.responses
            if (Array.isArray(responses)) {
                if (expandMultiple.value) {
                    for (const sub of responses) {
                        mappedEntries.push([sub.toString(), true])
                    }
                } else {
                    mappedEntries.push([t, responses as string[] ?? null])
                }
            } else {
                mappedEntries.push([t, responses?.toString() ?? null])
            }
        }
        const original = {
            ...mapValues(applications.settings?.fields, () => null), //fallback blank values
            ...Object.fromEntries(mappedEntries),
            ...a.record,
        }
        return {
            index: i,
            confirmationSent: false,
            state: ApplicationState.NEW,
            original: isEmpty(a.record.overlays) ? undefined : original,
            ...original,
            ...a.record.overlays,
            id: a.record.id,// is non-enumerable so must be listed explicitly
        }
    }))

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
const loadedDt = ref(false)
watch([() => table.value?.dt, scrollY, keyboardVisible], () => {
    const layoutRow = document.querySelector('.dt-layout-row')
    const scrollBody = document.querySelector('.dt-scroll-body') as HTMLDivElement
    if (layoutRow && scrollBody) {
        layoutRowHeight.value = layoutRow.scrollHeight
        scrollBody.style.maxHeight = `${scrollY.value}px`
    }
})
function initComplete() {
    setTimeout(() => loadedDt.value = true, 500)
}
async function reload<T>(between?: () => PromiseLike<T>) {
    if (!table.value) {
        return
    }
    showTable.value = false
    if (between) {
        await between()
    }
    nextTick(() => showTable.value = true)
}

const selection = ref<ApiRowsMethods<typeof data.value> | ApiCellsMethods<typeof data.value>>()
function selectionChanged() {
    if (table.value) {
        selection.value = editMode.value ? table.value.dt.cells({ selected: true }) : table.value.dt.rows({ selected: true })
        if (selection.value[0].length) {
            $('.selected-only').removeClass('disabled')
        } else {
            $('.selected-only').addClass('disabled')
        }
    }
}
function openEditLink() {
    const link = selection.value?.data()?.[0].editLink
    if (link) {
        window.open(link, '_blank', 'noopener,noreferrer')
    }
}

function copySelected() {
    if (editMode.value) {
        const cells = table.value?.dt.cells({ selected: true }).data().toArray().filter(c => !!c).map(c => `"${c.toString().replaceAll('"', '""')}"`)
        if (cells && cells.length) {
            const text = cells.length > 1 ? cells.join(',') : cells[0]
            navigator.clipboard.writeText(text)
        }
    } else {
        const rows = table.value?.dt.rows({ selected: true })
        if (rows && rows.length) {
            let text = ''
            rows.every(function (rowIdx) {
                text += this.cells(rowIdx, ':visible').data().map(c => `"${(c ?? '').toString().replaceAll('"', '""')}"`).join(',') + '\n'
            })
            navigator.clipboard.writeText(text)
        }
    }
}

function responseDoc(id: string) {
    return doc(knownCollection(firestore, 'applications'), cloud.selectedEvent, 'responses', id)
}
async function editOverlay(this: ApiButton<typeof data.value>) {
    if ((selection.value?.data()?.length ?? 2) > 1) {
        alert('Vyberte jednu buňku')
        return
    }
    const ids = selection.value!.indexes()
    const row = table.value?.dt.row(ids[0].row).data() as unknown as typeof data.value[number]//DT has bad return type definition
    const col = table.value?.dt.column(ids[0].column).dataSrc()
    if (typeof col != 'string' || !row) {
        alert('Tuto buňku nelze upravit')
        return
    }
    const d = responseDoc(row.id)
    const p = prompt('Zadejte hodnotu pro přepsání, nebo hodnotu smažte pro vrácení hodnoty z přihlášky', selection.value!.data()?.[0])
    if (p == '') {
        await updateDoc(d, {
            [`overlays.${col}`]: deleteField(),
        })
    } else if (p) {
        using _ = ui.loading()
        await updateDoc(d, {
            [`overlays.${col}`]: p,
        })
    }
}

function changeState(state: ApplicationState) {
    const id = selection.value?.data()?.[0].id
    if (!id) {
        return
    }
    setDocT(responseDoc(id), {
        state,
    } as ResponseRecord, { merge: true })
}

const ellipsis = computed(() => app.$DataTable.value?.render.ellipsis(20))
const date = computed(() => app.$DataTable.value?.render.date(czechDates.value ? 'DD. MM.' : 'YYYY-MM-DD') ?? ((response: string) => toJSDate(response)?.toLocaleDateString() ?? response))
const complexColumns = computed(() => [
    {
        data: 'index',
        title: '#',
        className: 'print',
        columnControl: windowSize.width.value > 700 ? [
            [
                'order',
                'searchDropdown',
                'spacer',
                { extend: 'colVisDropdown', text: 'Sloupce', columns: ':not(.always-visible)' },
                'showAll',
            ],
        ] : [
            'order',
        ],
    },
    {
        data: 'email',
        title: 'E-mail',
        className: 'print email',
    },
    {
        data: 'name',
        title: 'Jméno a příjmení',
        className: 'print',
    }, {
        data: 'town',
        title: 'Město',
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
    {
        data: 'phone',
        title: 'Telefon',
        render: renderPhone,
        className: 'hover-visible-trigger',
    },
])

function renderPhone(number: string) {
    return `${number} <a class="only-hover-visible" href="tel:${number}">${useIconEl('phone')}</a>`
}

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
const visibilityButtons: ButtonConfig[] = [
    {
        text: useIconEl('collapse-all') + ' Zobrazit pouze základní sloupce',
        titleAttr: 'Zobrazí pouze sloupce, které jsou ve výchozím nastavení potřeba do ubytovacího listu',
        action: basicColumns,
    }, {
        text: useIconEl('table-of-contents') + ' Zobrazit všechny sloupce',
        action: allVisible,
    },
]
function allVisible(_: any, dt: Api<any>) {
    dt.columns().visible(true)
}
function basicColumns(_: any, dt: Api<any>) {
    dt.columns('.print').visible(true)
    dt.columns(':not(.print, .always-visible)').visible(false)
}
const buttons = computed(() => [
    {
        extend: 'savedStates',
        text: 'Zobrazení',
        buttons: [
            { extend: 'colvis', text: 'Sloupce', columns: ':not(.always-visible)' },
            ...visibilityButtons,
            { extend: 'spacer', style: 'bar' },
            { extend: 'createState', text: 'Uložit zobrazení' },
            { extend: 'removeAllStates', text: 'Smazat uložená zobrazení' },
            { extend: 'spacer', style: 'bar' },
        ],
    }, ...(cloud.resolvedPermissions.editSchedule ? editMode.value ? [{
        text: useIconEl('edit'),
        titleAttr: 'Upravit hodnotu pro zobrazení (neovlivní původní data v přihlášce)',
        className: 'selected-only disabled',
        action: editOverlay,
    }] : [{
        extend: 'collection',
        text: 'Účastník',
        className: 'selected-only disabled',
        buttons: [
            {
                text: useIconEl('edit') + ' Upravit údaje',
                action: openEditLink,
            }, {
                text: useIconEl('account-question') + ' Změnit stav',
                extend: 'collection',
                buttons: Object.entries(ApplicationStateUI).map(([key, val]) => ({
                    text: useIconEl(val.icon) + ' ' + val.name,
                    action: () => changeState(parseInt(key) as ApplicationState),
                })),
                autoClose: true,
            },
        ],
    }] : []), {
        text: useIconEl('content-copy'),
        className: 'selected-only disabled',
        titleAttr: 'Zkopíruje všechny vybrané buňky do schránky. Pokud je vybráno více buněk v jednom řádku, budou sloučeny do jedné buňky oddělené čárkou.',
        action: copySelected,
    }, {
        extend: 'print',
        text: 'Ubytovací list',
        autoClose: true,
        autoPrint: false,
        title: '',
        exportOptions: {
            columns: ':visible:not(.always-visible)',
        },
        split: [
            {
                extend: 'print',
                autoPrint: false,
                text: '<span class=\'noinvert\'>🖨️</span> Tisk',
                title: '',
                exportOptions: {
                    columns: ':visible:not(.always-visible)',
                },
            }, {
                extend: 'spacer', style: 'bar',
            },
            ...visibilityButtons,
        ],
    }, {
        extend: 'collection',
        text: '<span class=\'noinvert\'>🗒️</span> Data formuláře',
        autoClose: true,
        buttons: [
            {
                text: useIconEl('cog-refresh') + ' Aktualizovat data z formuláře',
                titleAttr: 'Stáhne všechny odeslané přihlášky a jejich změny do interní databáze',
                action: refresh,
            }, ...questionControlColumns.value,
        ],
    },
])
watchDebounced([buttons, showTable, windowSize], (newVal, oldVal) => {
    if (oldVal && isMatchWith(oldVal, newVal, val => typeof val == 'function' ? true : undefined)) {
        return
    }
    if (table.value && showTable.value && dtButtons.value) {
        const large = windowSize.width.value >= 700
        if (oldVal?.[1] || large) {
            for (const b of table.value.dt.buttons(large ? undefined : 1, null).toArray()) {
                table.value.dt.button(b.node).remove()
            }
        }
        nextTick(() => {
            if (oldVal?.[1] || large) {
                for (const button of buttons.value) {
                    table.value!.dt.button(large ? undefined : 1, null).add(null as any, button as any)
                }
            }
            else {
                new app.$DataTable.value!.Buttons(table.value!.dt, { buttons: buttons.value })
                table.value!.dt.buttons(1, null).container().appendTo(dtButtons.value!)
            }
        })
    }
}, { debounce: 500, immediate: true })
const searchList = windowSize.width.value > 700 ? [
    [
        'order',
        'searchList',
        'spacer',
        { extend: 'colVisDropdown', text: 'Sloupce', columns: ':not(.always-visible)' },
        'showAll',
    ],
] : undefined


function renderBool(data: boolean) {
    return data ? '✔' : ''
}
function renderMultiBool(data: string[], type: string, row: string[]) {
    data?.map(d => ellipsis.value(d, type, row)).join(',<br>')
}
const columns = computed(() => {
    const fieldSettings = Object.keys(applications.settings?.fields ?? {})?.filter(k => !complexColumns.value.find(c => c.data == k))
    const fieldColumns: ConfigColumns[] = []
    for (const key of fieldSettings) {
        const val = applications.settings!.fields[key]!
        const q = typeof val == 'number' ? availableQuestions.value[val] : Object.values(availableQuestions.value).find(a => a.title == val)
        if (q?.multi && expandMultiple.value) {
            q.values.forEach(v =>
                fieldColumns.push({
                    data: v,
                    className: 'multi',
                    title: ellipsis.value(v, 'display'),
                    columnControl: searchList,
                    render: renderBool,
                }),
            )
        }
        else {
            fieldColumns.push({
                data: key,
                title: q?.title ?? val.toString(),
                columnControl: (q?.values.size ?? 0) < 5 ? searchList : undefined,
                render: q?.multi ? renderMultiBool : ellipsis.value ?? '',
            })
        }
    }

    return [
        // Special form fields
        ...complexColumns.value,
        // Form fields
        ...fieldColumns,
        { data: null, title: 'Celkem', render: computeTotal, visible: false, className: 'print' },
        { data: 'paid', title: 'Převodem', render: renderUndefined, className: 'print' },
        { data: 'remaining', title: 'Zbývá', render: renderUndefined, className: 'print' },
        {
            data: 'confirmationSent', title: '📧', render: renderSent,
            columnControl: searchList,
            visible: false,
        },
        {
            data: 'state', title: 'Stav', render: renderState,
            visible: false,
            columnControl: searchList,
        },
        {
            data: 'editTimestamp', title: 'Upraveno', render: date.value,
            visible: false,
        },
        { data: 'edits', title: 'Počet úprav', visible: false },
        { data: null, title: 'Podpis', render: () => '', className: 'print', visible: false },
    ].map(c => ({ defaultContent: '', render: ellipsis.value, ...c }))
})
function renderState(data: ApplicationState) {
    return ApplicationStateUI[data].name
}
function renderSent(data: boolean) {
    return data ? '✔' : '<span class=\'muted\' title=\'Neodeslán\'>❌</span>'
}

function renderUndefined(data?: string) {
    return data || ''
}

function computeTotal(row: typeof data.value[0]) {
    return ((parseInt(row.paid as any) ?? 0) + parseInt(row.remaining ?? 0 as any)) || ''
}

watchDebounced([responsive, columns, czechDates], (newVal, oldVal) => (!loadedDt.value || !app.$DataTable || isMatchWith(oldVal, newVal, (val) => typeof val == 'function' ? true : undefined)) ? null : reload(), { debounce: 500 })
watchDebounced(editMode, val => {
    if (table.value) {
        table.value.dt.cells().deselect()
        table.value.dt.rows().deselect()
        table.value.dt.select.items(val ? 'cell' : 'row')
    }
}, { debounce: 500 })
onMounted(() => setTimeout(() => {
    if (!showTable.value) {
        showTable.value = true
    }
}, 1000))

</script>

<style lang="scss">
.confirmed td {
    background: #00800038
}

.rejected td {
    background: #ff000023
}

.cancelled {
    color: gray;
}

.cancelled,
.rejected {
    td.email {
        text-decoration: line-through;
    }
}

td.overlayed {
    position: relative;

    &::after {
        content: '';
        position: absolute;
        inset: 0;
        z-index: -1;

        background: #00ffff40;
    }
}

.dtButtons {
    @media screen and (max-width: 700px) {
        display: flex;
        gap: .8rem;
        flex-wrap: wrap;
    }
}
</style>