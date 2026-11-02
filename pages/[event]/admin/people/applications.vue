<template>
    <div :class="{ selecting }">
        <p v-if="secretsError" class="error">
            Registrační formulář je <NuxtLink :to="formSettings">třeba propojit s aplikací.</NuxtLink>
        </p>
        <details v-if="!isEmpty(filteredBy)">
            <summary>
                Na tabulku jsou aplikovány filtry
            </summary>
            <FilterBadge
                v-for="(values, key) in filteredBy" :key="`filter${key}`"
                :model-value="values.map((v: string) => ({ value: v }))"
                :title="decodeHTMLEntities(stripHtml(columns[key].title))" @delete="deleteFilter(key)" />
        </details>
        <ProgressBar v-if="applications.loadingApplications" />
        <LazyDataTable
            v-else-if="showTable" id="applications" ref="table" class="display compact fancy"
            ondragstart="return false;" ondrop="return false;" :options="{
                deferRender: true,
                responsive, colReorder: true, stateRestore: true, scroller: true, scrollCollapse: true, keys: true,
                columnControl: columnControl,
                initComplete,
                createdRow(this: { api(): Exclude<typeof table, null>['dt'] }, row: HTMLTableRowElement, d: typeof data[number], _i: number, cells: HTMLTableCellElement[]) {
                    row.classList.add(ApplicationStateUI[d.state as ApplicationState].class)
                    const _api = this

                    if (!isEmpty(d.overlays)) {
                        // eslint-disable-next-line vue/this-in-template
                        const overlayKeys = Object.keys(d.overlays)
                        overlayKeys.concat(...expandMultiple ?
                            overlayKeys.map(o => availableQuestions[parseIntOrNull((applications.settings?.fields[o] as string) ?? o) ?? d.questions.find((q: QuestionResponse) => q.title == (applications.settings?.fields[o] ?? o))?.id ?? 0]
                                ?.values.values().toArray().map((v: string) => `${o}.${simpleHash(v)}`)
                            ) : []) // add expanded checkboxes to the search query
                            .map(o => maybe(maybeIndex(_api.api().columns().dataSrc().indexOf(o)), i => {
                                cells[i].classList.add('overlayed')
                                cells[i].title ||= 'Hodnota upravena pro zobrazení. Původní hodnota: ' + get(d.original, o)
                            }
                            ))
                    }
                    cells.map(c => c.title ||= `${ApplicationStateUI[d.state as ApplicationState].name} přihláška`)//cannot use for because Vue cripples local variables
                },
                layout: {
                    topEnd: null,
                },
                ordering: {
                    indicators: false,
                    handler: false
                },
                select: {
                    style: 'api',
                    items: 'cell',
                    keys: true,
                },
                scrollY: scrollY as any,
            }" :data="data" :columns="columns" @contextmenu="contextMenu" @dblclick="tableDblClick"
            @select="selectionChanged(false)" @deselect="selectionChanged(false)" />
        <Teleport v-if="mounted" to="#topNav">
            <div ref="dtButtons" class="dtButtons">
                <span>
                    <input
                        v-model="searchDebounced" type="search" placeholder="Hledat..." class="dt-search dt-input"
                        @input="isSearching = true">
                    <button
                        class="dt-button" :disabled="!isSearching"
                        @click="table?.dt.columns().columnControl.searchClear(); search = ''; table?.dt.draw()">
                        <Icon name="mdi:filter-off" />
                    </button>
                </span>
            </div>
        </Teleport>

        <p v-if="refreshResult.ok" class="mb-5">
            <template v-if="refreshResult.data">
                Nové přihlášky: {{ refreshResult.data.new }} <br>
                Změněné přihlášky: {{ refreshResult.data.changed }}
                <br>
                <small>
                    <Icon name="mdi:info" /> Pokud někdo odeslal přihlášku teprve před pár minutami, může chvíli trvat,
                    než se do
                    zobrazovaných dat propíše.
                </small>
            </template>
            <template v-else>
                Nová data se nepodařilo stáhnout
            </template>
        </p>
        <p v-else-if="refreshResult.error" class="error">
            <code>{{ refreshResult.error?.message || refreshResult.error?.code || refreshResult.error?.http }}</code>
        </p>
        <Teleport v-if="signatureEnabled" to="#overlay" defer>
            <div class="signature-overlay">
                <div class="signature-container">
                    <SignatureDraw ref="signature" />
                    <div class="signature-buttons">
                        <button @click="signatureEnabled = false">Zrušit</button>
                        <button @click="signature?.clear()">Smazat</button>
                        <button @click="saveSignature">Uložit</button>
                    </div>
                </div>
            </div>
        </Teleport>
        <Teleport v-if="contextMenuState.open" to="#overlay" defer>
            <div class="context-menu-backdrop" @click="contextMenuState.open = false" />
            <div class="context-menu" :style="{ top: contextMenuState.y + 'px', left: contextMenuState.x + 'px' }">
                <button v-if="contextMenuState.column !== 'signature'" @click="() => editOverlay()">Upravit
                    hodnotu</button>
                <button @click="openEditLink()">Upravit přihlášku</button>
                <div class="divider" />
                <div class="submenu">
                    <button
                        v-for="(state, key) in ApplicationStateUI" :key="key + 'a'"
                        @click="() => changeState(parseInt(key))">
                        {{ state.name }}
                    </button>
                </div>
                <div class="divider" />
                <button @click="selectedRowsData?.[0]?.id ? signRow(selectedRowsData[0].id, selectedRowsData[0].signature) : null">Podepsat</button>
            </div>
        </Teleport>
    </div>
</template>

<script lang="ts" setup>
import type { Api, ConfigColumns } from 'datatables.net-dt'
import type { ApiResponse, Responses } from '~/form-connector/src/api'
import type { SignatureDraw } from '#components'
import { type QuestionResponse, ApplicationState } from '~/form-connector/src/responses'
import { deleteField, doc, updateDoc } from 'firebase/firestore'
import get from 'lodash.get'
import mapValues from 'lodash.mapvalues'
import isEmpty from 'lodash.isempty'
import isMatchWith from 'lodash.ismatchwith'
import { SecretsError } from '~/form-connector/src/errors'
import { useTableUtils } from '~/utils/table/tableUtils'
import { simpleHash, renderPhone, renderBool, renderUndefined, renderSent, renderState } from '~/utils/table/render'
import { useTableContextMenu } from '~/utils/table/contextMenu'
import { useApplicationsTableButtons } from './buttons'

declare module 'datatables.net' {
    interface ApiButtonMethods<T> extends Omit<Api<T>, 'trigger'> {
        collectionRebuild(config: ButtonConfig[]): ApiButtons<T>
    }
    interface ApiRow<T> {
        (): ApiRowMethods<T>
    }
}

definePageMeta({
    title: 'Přijaté přihlášky',
    topNav: 'collapsed',
})

const mounted = ref(false)
onMounted(() => {
    mounted.value = true
})
const app = useNuxtApp()
const applications = useApplications()
const api = useRegistrationForm()
const cloud = useCloudStore()
const dtButtons = useTemplateRef<HTMLDivElement>('dtButtons')
const firestore = useFirestore()
const ui = useUI()
const windowSize = useWindowSize()
const showTable = ref(false)
const search = ref('')
const searchDebounced = refDebounced(search, 500)
const secretsError = ref(false)
const signature = useTemplateRef<InstanceType<typeof SignatureDraw>>('signature')
const signatureEnabled = ref(false)
const signResponseId = ref<string | null>(null)

const table = useTemplateRef<HTMLDivElement & { dt: Api<any> }>('table')
const {
    cancelDrag,
    loadedDt,
    isSearching,
    filteredBy,
    scrollY,
    selecting,
    selectedCell,
    selectedRowsData,
    selectedRowClass,
    selectionChanged,
    deselect,
} = useTableUtils<any>(table)

const {
    contextMenu,
    contextMenuState,
} = useTableContextMenu(table, selectedCell, cancelDrag)

const {
    buttons,
    responsive,
    expandMultiple,
    czechDates,
    formSettings,
    toAdd,
    availableQuestions,
    undescribedVisible,
    changeState,
} = useApplicationsTableButtons(table, selecting, computed({
    get: () => contextMenuState.value.open,
    set: (val) => contextMenuState.value.open = val,
}), applications, selectedCell, selectedRowsData, selectedRowClass, responseDoc, refresh, openEditLink, editOverlay, deselect, signRow)

async function signRow(id: string, existingSignature?: string) {
    contextMenuState.value.open = false
    signResponseId.value = id
    signatureEnabled.value = true
    ui.overlayEnabled = true
    if (existingSignature) {
        await nextTick()
        signature.value?.loadImage(existingSignature)
    }
}

async function saveSignature() {
    if (!signResponseId.value) { return }
    const imageData = signature.value?.getImage()
    if (!imageData) {
        if (!confirm('Podpis je prázdný. Chcete jej smazat?')) { return }

        using _ = ui.loading()
        await updateDoc(responseDoc(signResponseId.value), {
            signature: deleteField(),
        })
    } else {
        const canvas = document.createElement('canvas')
        canvas.width = imageData.width
        canvas.height = imageData.height
        const ctx = canvas.getContext('2d')
        if (ctx) {
            ctx.fillStyle = 'white'
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            ctx.putImageData(imageData, 0, 0)
            // Compress and convert to base64
            const dataUrl = canvas.toDataURL('image/jpeg', 0.4)

            using _ = ui.loading()
            await updateDoc(responseDoc(signResponseId.value), {
                signature: dataUrl,
            })
        }
    }

    signatureEnabled.value = false
    signResponseId.value = null
    signature.value?.clear()
}

watch(searchDebounced, val => {
    if (table.value) {
        table.value.dt?.search(val).draw()
    }
})

const columnControl = computed(() => windowSize.width.value > 700 ? [
    'order',
    [
        { extend: 'searchDropdown', text: 'Hledat' },
        'spacer',
        { extend: 'colVisDropdown', text: 'Sloupce', columns: ':not(.always-visible, .undescribed)' },
        'showAll',
    ],
] : undefined)

const refreshResult
    = ref<ApiResponse<Responses['refreshResponses']>>({
        ok: false,
    })
const data = computed(() => {
    return applications.filteredMapped.toSorted((a, b) => a.record.timestamp - b.record.timestamp)
        .filter(a => applications.includeCancelled ? true : ![ApplicationState.CANCELLED, ApplicationState.REJECTED].includes(a.record.state ?? ApplicationState.NEW))
        .map((a, i) => {
            const mappedTitles = Object.keys(a.mapped ?? {}).filter(k => typeof k == 'string')
            const mappedEntries: [string, string | string[] | { [multiresponse: string]: boolean } | boolean | null][] = []
            for (const t of mappedTitles) {
                const responses = a.mapped![t]?.responses
                if (Array.isArray(responses)) {
                    mappedEntries.push(multiExpansion(a.mapped?.[t]?.id ?? 0, t, responses as string[]))
                } else {
                    mappedEntries.push([t, responses?.toString() ?? null])
                }
            }
            const original = {
                // undescribed questions, hidden by default
                ...Object.fromEntries(toAdd.value.map(k => {
                    const q = a.record.questions.find(q => q.id == parseInt(k))
                    if (q && Array.isArray(q.responses)) {
                        return multiExpansion(q.id ?? 0, k, q.responses as string[])//Hope it will not be recursive array / checkbox matrix question
                    }
                    else {
                        return [k, q?.responses.toString() ?? null]
                    }
                })),

                ...mapValues(applications.settings?.fields, () => null), // fallback blank values
                ...Object.fromEntries(mappedEntries),
                ...a.record,
            }
            return {
                index: i,
                confirmationSent: false,
                state: ApplicationState.NEW,
                original: isEmpty(a.record.overlays) ? undefined : original,
                ...original,
                ...mapObject(a.record.overlays ?? {}, (o, k) => Array.isArray(o) ? multiExpansion(a.mapped?.[k]?.id ?? 0, k, o)[1] : o),
                id: a.record.id, // is non-enumerable so must be listed explicitly
            }
        })
})

function multiExpansion(id: number, t: string, responses: string[]): [string, string[]] {
    if (expandMultiple.value) {
        // TODO lookup availableQuestions with title or id
        const entries = // populate all with false
            ((availableQuestions.value[id] ?? Object.entries(availableQuestions.value).find(([_, q]) => q.title == t)?.[1])
                ?.values.values().toArray().map(v => [simpleHash(v), false]) ?? [])
                // set the checked ones to true
                .concat(responses.map(r => [simpleHash(r as string), true]))

        return [t, entries.length ? Object.fromEntries(entries) : {}]
    }
    else {
        return [t, responses ?? null]
    }
}

async function refresh() {
    secretsError.value = false
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
    if (refreshResult.value.error?.http == SecretsError.code) {
        secretsError.value = true
    }
    table.value?.dt?.draw()
    table.value?.dt?.responsive.recalc()
}
watch(() => applications.loadingApplications, l => {
    if (!l) {
        table.value?.dt?.responsive.recalc()
    }
}, { immediate: true })
onMounted(() => table.value?.dt?.responsive.recalc())

function deleteFilter(col: `${number}`) {
    const c = table.value!.dt.column(col)
    c.columnControl.searchClear()
    c.search('').table().draw()
}
function initComplete() {
    setTimeout(() => loadedDt.value = true, 500)
    filteredBy.value = {}
}
let reloaded = false
async function reload<T>(between?: () => PromiseLike<T>) {
    if (!table.value) {
        return
    }
    showTable.value = false
    reloaded = true
    if (between) {
        await between()
    }
    nextTick(() => showTable.value = true)
}

function openEditLink() {
    contextMenuState.value.open = false
    if (selectedRowsData.value) {
        if ((selectedCell.value?.data()?.length ?? 2) > 1) {
            alert('Vyberte jednoho účastníka')
            return
        }
        const link = selectedRowsData.value[0]?.editLink
        if (link) {
            window.open(link, '_blank', 'noopener,noreferrer')
        }
    }
}

function responseDoc(id: string) {
    return doc(knownCollection(firestore, 'applications'), cloud.selectedEvent, 'responses', id)
}

let dblClickActive = false
async function tableDblClick(event: MouseEvent) {
    if (!dblClickActive) {
        dblClickActive = true
        const cell = (event.target as HTMLElement).closest('td')
        if (cell instanceof HTMLTableCellElement && '_DT_CellIndex' in cell) {
            table.value?.dt.cell(cell).select()
            await editOverlay()
        }
        setTimeout(() => dblClickActive = false, 200)
    }
}

async function editOverlay() {
    contextMenuState.value.open = false
    if ((selectedCell.value?.data()?.length ?? 2) > 1) {
        alert('Vyberte jednu buňku')
        return
    }
    const ids = selectedCell.value!.indexes()
    const response = table.value?.dt.row(ids[0].row).data() as unknown as typeof data.value[number]//DT has bad return type definition
    let col = table.value?.dt.column(ids[0].column).dataSrc()
    if (typeof col != 'string' || !response) {
        alert('Tuto buňku nelze upravit')
        return
    }
    const doc = responseDoc(response.id)
    if (col === 'signature') {
        signRow(response.id, response.signature)
        return
    }
    const selData = selectedCell.value!.data()
    let p: string | string[] | null = prompt('Zadejte hodnotu pro přepsání, nebo hodnotu smažte pro vrácení hodnoty z přihlášky', selData?.[0])

    const dotIndex = col.indexOf('.')
    if (p == '') {
        if (expandMultiple.value && dotIndex != -1) {
            // handle multiple checkbox response transformation
            col = col.substring(0, dotIndex)
        }
        await updateDoc(doc, {
            [`overlays.${col}`]: deleteField(),
        })
    } else if (p) {
        // handle multiple checkbox response transformation
        if (expandMultiple.value && dotIndex != -1) {
            // Transform from multiple to array
            const sub = col.substring(dotIndex + 1)
            col = col.substring(0, dotIndex)

            const titleOrId = applications.settings?.fields[col] ?? parseIntOrNull(col) ?? col
            const question = response.questions.find((q: QuestionResponse) => typeof titleOrId == 'string' ? (q.title == titleOrId) : (q.id == titleOrId))
            if (question) {
                // Find the index of this response in the availableQuestions values
                if (p == 'true') {
                    p = [...question.responses as string[], sub]
                } else if (p) {
                    p = (question.responses as string[]).filter((r: string) => r != sub)
                }

            }
        } else {
            // Only convert from string to array
            const val = applications.settings!.fields[col] ?? parseIntOrNull(col) ?? col
            const q = typeof val == 'number' ? availableQuestions.value[val] : Object.values(availableQuestions.value).find(a => a.title == val)
            if (q && q.multi) {
                p = p.split(',').map(s => s.trim())
            }
        }
        using _ = ui.loading()
        await updateDoc(doc, {
            [`overlays.${col}`]: p,
        })
    }
}



const ellipsis = computed(() => app.$DataTable.value?.render.ellipsis(20) ?? ((data: string) => data))
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
                { extend: 'colVisDropdown', text: 'Sloupce', columns: ':not(.always-visible, .undescribed)' },
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
        visible: false,
    },
    {
        data: 'name',
        title: 'Jméno a příjmení',
        className: 'print',
    }, {
        data: 'town',
        title: 'Město',
        className: 'print',
        visible: false,
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
        visible: false,
    },
])

// Basically watching for reload() and changes in these variables
watchThrottled([buttons, showTable, windowSize.width, loadedDt], (newVal, oldVal) => {
    if (oldVal && isMatchWith(newVal, oldVal, val => typeof val == 'function' ? true : undefined) && !reloaded) {
        return
    }
    if (table.value && showTable.value && dtButtons.value) {
        if (oldVal?.[1]) {
            const nowButtons = table.value.dt.buttons().toArray()
            for (const b of nowButtons) {
                table.value.dt.button(b.node).remove()
            }
        }
        nextTick(() => {
            const lastButtons = dtButtons.value?.querySelector('.dt-buttons')
            if (oldVal?.[1] && lastButtons) {
                for (const button of buttons.value) {
                    table.value!.dt.button().add(null as any, button as any)
                }
                lastButtons.classList.add('inline-block')
            }
            else {
                new app.$DataTable.value!.Buttons(table.value!.dt, { buttons: buttons.value })
                const newButtons = table.value!.dt.buttons().container()
                newButtons[0].classList.add('inline-block')
                newButtons.appendTo(dtButtons.value!)
            }
            if (reloaded) {
                setTimeout(() => reloaded = false, 500)
            }
        })
    }
}, { throttle: 500, immediate: true })
const searchList = windowSize.width.value > 700 ? [
    [
        'order',
        'searchList',
        'spacer',
        { extend: 'colVisDropdown', text: 'Sloupce', columns: ':not(.always-visible, .undescribed)' },
        'showAll',
    ],
] : undefined

function renderMultiBool(data: string[], type: string, row: string[]) {
    if (typeof data == 'string') {
        return ellipsis.value(data, type, row)
    }
    if (Array.isArray(data)) {
        return data?.map(d => ellipsis.value(d, type, row)).join(',<br>')
    }
    return data
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
                    data: `${key}.${simpleHash(v)}`,
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
                visible: false,
            })
        }
    }
    const undescribedColumns: ConfigColumns[] = []
    for (const k of toAdd.value) {
        const q = availableQuestions.value[k as any]//TODO type check
        if (q.multi && expandMultiple.value) {
            q.values.forEach(v =>
                undescribedColumns.push({
                    data: `${k}.${simpleHash(v)}`,
                    name: `${k}.${simpleHash(v)}`,
                    className: 'multi undescribed',
                    title: ellipsis.value(v, 'display'),
                    columnControl: searchList,
                    render: renderBool,
                    visible: undescribedVisible.has(k),
                }),
            )
        } else {
            undescribedColumns.push({
                data: k, title: q.title, visible: undescribedVisible.has(k), className: 'undescribed', name: k,
            })
        }
    }
    return [
        // Special form fields
        ...complexColumns.value,
        // Form fields
        ...fieldColumns,
        ...undescribedColumns,// undescribed questions columns
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
        { data: 'signature', title: 'Podpis', render: (data: string) => data ? `<img class="absolute top-0 w-full" src="${data}">` : '', className: 'print m-0 relative overflow-hidden hover-overlay' },
    ].map(c => ({ defaultContent: '', render: ellipsis.value, ...c }))
})

function computeTotal(row: typeof data.value[0]) {
    return ((parseInt(row.paid as any) ?? 0) + parseInt(row.remaining ?? 0 as any)) || ''
}

watchThrottled([responsive, columns, czechDates],
    (newVal, oldVal) =>
        (!loadedDt.value || !app.$DataTable || isMatchWith(oldVal, newVal, (val) =>
            typeof val == 'function' ? true : undefined)) ? null : reload(), { throttle: 500 })

onMounted(() => setTimeout(() => {
    if (!showTable.value) {
        showTable.value = true
    }
}, 700))

</script>
