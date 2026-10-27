<template>
    <div>
        <p v-if="secretsError" class="error">
            Registrační formulář je <NuxtLink :to="formSettings">třeba propojit s aplikací.</NuxtLink>
        </p>
        <details v-if="!isEmpty(filteredBy)">
            <summary>
                Na tabulku jsou aplikovány filtry
            </summary>
            <FilterBadge v-for="(values, key) in filteredBy" :key="`filter${key}`"
                :model-value="values.map((v: string) => ({ value: v }))"
                :title="decodeHTMLEntities(stripHtml(columns[key].title))" @delete="deleteFilter(key)" />
        </details>
        <ProgressBar v-if="applications.loadingApplications" />
        <LazyDataTable v-else-if="showTable" id="applications" ref="table" class="display compact fancy"
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
            }" :data="data" :columns="columns" @dblclick="tableDblClick" @select="selectionChanged"
            @deselect="selectionChanged" />
        <Teleport v-if="mounted" to="#topNav">
            <div ref="dtButtons" class="dtButtons">
                <span>
                    <input v-model="searchDebounced" type="search" placeholder="Hledat..." class="dt-search dt-input"
                        @input="isSearching = true">
                    <button class="dt-button" :disabled="!isSearching"
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
    </div>
</template>

<script lang="ts" setup>
import type { Api, ApiCellsMethods, ApiRowsMethods, ButtonConfig, CellIdx, ConfigColumns } from 'datatables.net-dt'
import type StateRestore from 'datatables.net-staterestore/types/StateRestore'
import type { ApiResponse, Responses } from '~/form-connector/src/api'
import { type QuestionResponse, type ResponseRecord, ApplicationState } from '~/form-connector/src/responses'
import { SpecialApplicationFields } from '~/types/cloud'
import { deleteField, doc, updateDoc } from 'firebase/firestore'
import { setDoc as setDocT } from '~/utils/trace'
import get from 'lodash.get'
import mapValues from 'lodash.mapvalues'
import isEmpty from 'lodash.isempty'
import isMatchWith from 'lodash.ismatchwith'
import pickBy from 'lodash.pickby'
import { SecretsError } from '~/form-connector/src/errors'

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
onMounted(() => mounted.value = true)
const app = useNuxtApp()
const applications = useApplications()
const api = useRegistrationForm()
const cloud = useCloudStore()
const dtButtons = useTemplateRef<HTMLDivElement>('dtButtons')
const firestore = useFirestore()
const formSettings = computed(() => `/${cloud.selectedEvent}/admin/events/form`)
const keyboardVisible = inject<Ref<boolean>>('keyboardVisible')
const ui = useUI()
const windowSize = useWindowSize()
const responsive = useLocalStorage('responsive', false)
const expandMultiple = useLocalStorage('expandMultiple', true)
const czechDates = useLocalStorage('czechDates', false)
const showTable = ref(false)
const navigation = inject<Ref<HTMLDivElement | null>>('navigation')
const navigationSize = useElementSize(navigation, undefined, { box: 'border-box' })
const layoutRowHeight = ref(30)
const isSearching = ref(false)
const filteredBy = ref<Record<number, string[]>>({})
const search = ref('')
const searchDebounced = refDebounced(search, 500)
const scrollY = computed(() => (windowSize.height.value - navigationSize.height.value - layoutRowHeight.value - 120))
const secretsError = ref(false)
const sweepMode = ref(false)

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
const toAdd = computed(() => Object.keys(availableQuestions.value).filter((k: any) => !Object.values(applications.settings?.fields ?? {}).some(f => typeof f == 'number' && f == parseInt(k) || f == availableQuestions.value[k].title)))
const refreshResult
    = ref<ApiResponse<Responses['refreshResponses']>>({
        ok: false,
    })
const table = useTemplateRef<HTMLDivElement & { dt: Api<typeof data.value> }>('table')
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
const loadedDt = ref(false)
watch([() => table.value?.dt, scrollY, keyboardVisible], (_, [oldDt]) => {
    const layoutRow = document.querySelector('.dt-layout-row')
    const scrollBody = document.querySelector('.dt-scroll-body') as HTMLDivElement
    if (layoutRow && scrollBody) {
        layoutRowHeight.value = layoutRow.scrollHeight
        scrollBody.style.maxHeight = `${scrollY.value}px`
    }
    if (table.value?.dt && !oldDt) {
        table.value.dt.on('draw.dt', () => {
            //extract filter from column control extension
            const glob = !!table.value!.dt.search()
            // No point in wasting clock cycles if we already know it will be enabled
            if (!glob) {
                isSearching.value = false
                table.value!.dt.columns().every(function () {
                    if (this.search.fixed('dtcc') ||
                        this.search.fixed('dtcc-list')
                    ) {
                        isSearching.value = true
                    }
                })
            } else {
                isSearching.value = true
            }
        })
        table.value.dt.on('stateRestore-change', () => {
            nextTick(() => table.value!.dt.button('SaveStateRestore:name').text(useIconEl('eye') + ' Zobrazení'))
        })
        table.value.dt.on('search.dt', function () {
            table.value!.dt.columns().every(function (col) {
                const f = this.search.fixed('dtcc') || this.search.fixed('dtcc-list')
                if (f) {
                    if (typeof f == 'string') {//switch on SearchInputColumn<any[]> subtypes
                        filteredBy.value[col] = [f]
                    } else if (f instanceof RegExp) {
                        filteredBy.value[col] = [f.source]
                    } else if (typeof f == 'function') { // try columnControl settings
                        nextTick(() => {
                            const cc = (table.value!.dt.state() as any).columnControl[col]
                            if (cc.searchInput) {
                                filteredBy.value[col] = [`${cc.searchInput.logic}(${cc.searchInput.value})`]
                            } else if (cc.searchList) {
                                filteredBy.value[col] = cc.searchList
                            }
                        })
                    } else {
                        filteredBy.value[col] = ['[neznámý filtr]']
                    }
                    this.header().classList.add('filtered')
                } else {
                    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                    delete filteredBy.value[col]
                    this.header().classList.remove('filtered')
                }
            })
        })
        table.value.dt.columns().every(function () {
            this.header().addEventListener('dblclick', () => {
                const val = prompt('Zadejte nový název sloupce')
                if (val) {
                    this.title(val)
                }
            })
        })
    }
})
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

const selectedRow = 'selected-row'
const selection
    = ref<ApiRowsMethods<typeof data.value> | ApiCellsMethods<typeof data.value>>()

// --- Drag area selection (plain HTML DOM events) --------------------------------------
// As the hand sweeps across the rendered table, a "pass-over" event fires on every cell
// node it crosses. Desktop uses mouse events (`mouseover`); touchscreens use pointer
// events (`pointerover`) — so we listen on both families to cover keyboard + touchscreen.
// We attach on the stable table element so swept cells are recorded by coordinate; the
// lift-off event (`mouseup` / `pointerend`) ends the region and commits the cell block to a
// persistent set of "row|column" keys that accumulate ("multiple areas") across drags.
// On touchscreens the first anchor is gated with a short delay so an accidental scroll tap
// doesn't lock in a region immediately.
const DRAG_DOWN_EVENTS = ['pointerstart', 'mousedown'] as const   // marks the start of a drag
const DRAG_ROW_EVENTS = ['pointerover', 'mouseover'] as const     // swept cells during a drag
const DRAG_LIFT_EVENTS = ['mouseup', 'pointerend'] as const        // ends a drag on lift-off
const DRAG_TouchDelay = 300 // ms ignored right after touch-start (lets scrolling pass)
function isTouchscreen() {
    return typeof (globalThis as any).beforeinstallprompt !== 'undefined'
}
// pressed cell indices [row,column] swept during a drag and persisted across drags (multiple areas)
const dragKeys: Array<[number, number]> = []  // dragged cells, committed on lift-off; deduped on insert
const pastRegions: [number, number][] = []
let dragStartedAt: number | null = null         // touch-delay anchor timer, set by the down event
let dragActive = false                          // a drag is in progress; sweeps before it are ignored
// does this exact [row,column] already appear in dragKeys? (arrays compare by value, not reference)
function dragHasKey(r: number, c: number): boolean {
    for (const k of dragKeys) { if (k[0] === r && k[1] === c) { return true } }
    return false
}
function dragResolveCell(dt: any, node: HTMLElement): { row: number; column: number } | null {
    const tr = node.closest?.('tr') as HTMLElement | null
    if (!tr) { return null }
    // the rendered cell node carries its column index (_DT_CellIndex), so we can select cells individually
    const cell = (node instanceof HTMLTableCellElement ? node : node.closest?.('td') as HTMLTableCellElement | null) as HTMLTableCellElement | null
    if (!cell || !('_DT_CellIndex' in cell)) { return null }
    return (cell as any)._DT_CellIndex
}
// commit pressed indices as an exact per-cell union (grouped by row so each `.select()` hits
// exactly those cells in the row). Multiple `.select()` calls union into DataTables' selected
// state, and persisted keys across drags keep disconnected areas. selectionChanged re-syncs the
// CSS from that state. Indices were resolved at start/record, so this just groups them — no cell
// re-resolution here. Fires on lift-off only.
function dragFinalize(dt: Api<typeof data.value>, e: Event) {
    // An accidental touch tap that lifted too fast must not lock anything in; prior drags stay selected.
    if (isTouchscreen() && dragStartedAt != null
        && performance.now() - dragStartedAt < DRAG_TouchDelay) { dragActive = false; dragStartedAt = null; return }
    if (!dragKeys.length) { dragStartedAt = null; dragActive = false; return }
    if (sweepMode.value) {
        for (const [r, col] of dragKeys) {
            dt.cells(r, col).select()
        }
    } else {
        const node = resolveDragNode(e.target as HTMLElement | null)
        if (node) { dragRecordCell(node) }

        const bb = boundingRect(dragKeys)
        const cols = [...new Array(bb.maxCol - bb.minCol + 1).keys().map(k => k + bb.minCol)]
        const clear = e instanceof MouseEvent && !e.shiftKey && !e.ctrlKey

        const sel = selection.value?.toArray()
        const selectedSingle = dragKeys.length == 1
            && sel?.some((ss: CellIdx[]) => ss.find((s: CellIdx) => s.row == dragKeys[0][0]))
            && sel.some((ss: CellIdx[]) => ss.find((s: CellIdx) => s.column == dragKeys[0][1]))
        if (clear) {
            dt.cells({ page: 'all' }).deselect()
            dt.rows({ page: 'all' }).deselect()
        }
        if (selectedSingle) {//deselect single already selected cell
            const coords = dragKeys[0]
            nextTick(() => {
                selectionChangedDisabled = true
                dt.cell(...coords)!.deselect()
                selectionChangedDisabled = false
                selectionChanged(true)
            })
        } else {
            for (let r = bb.minRow; r <= bb.maxRow; r++) {
                dt.cells(r, cols).select()
            }
        }

        dragKeys.splice(0)
    }
    dragActive = false; dragStartedAt = null
}
// record a pressed cell's index [row,column] during an active drag. The down seeds the first
// index; sweeps add more — cells resolve here, never at finalize. Sweeps before the down event
// (e.g. incidental pointer sweeps while not dragging) are ignored.
function dragRecordCell(node: HTMLElement) {
    if (!dragActive) { return }
    const now = performance.now()
    // gate anchors set by the down event; ignore crosses within DRAG_TouchDelay so a scroll
    // tap isn't read as a sweep
    if (isTouchscreen() && dragStartedAt != null && now - dragStartedAt < DRAG_TouchDelay) { return }
    const idx = dragResolveCell(table.value?.dt as any, node)
    if (!idx || idx.row < 0 || idx.column < 0) { return }
    if (!dragHasKey(idx.row, idx.column)) { dragKeys.push([idx.row, idx.column]) }
}
// attach all drag listeners once to the whole table element instead of per row node.
// A drag is a three-part gesture on DOM events:
//   * DOWN  (`pointerstart` / `mousedown`): the moment the user places their finger/hand on
//           the screen. This anchors the touch-clock and seeds the first cell so the region
//           begins from where they start, not from an ambiguous `-over`.
//   * ROW   (`pointerover` / `mouseover`): every cell swept over between down and lift;
//           recorded only while a drag is active.
//   * LIFT  (`mouseup` / `pointerend`): ends the region and commits the cell block exactly
//           once. Keeping listeners on the one stable table node means no per-draw rebuild.
const dragTableHooked = new WeakSet<HTMLElement>()
function resolveDragNode(target: HTMLElement | null) {
    const node = target?.closest('td')
    return node instanceof HTMLTableCellElement ? node : null
}
function dragWireTable() {
    const el = table.value?.dt?.table()?.node() as HTMLElement | null
    if (!el || typeof el.addEventListener !== 'function' || dragTableHooked.has(el)) { return }
    dragTableHooked.add(el)
    // down: start a drag. Anchor the touch-clock here (not on the first `-over`) so incidental
    // sweeps while not dragging are ignored, and seed the starting cell into the region.
    const start = (e: Event) => {
        dragActive = true
        if (isTouchscreen()) { dragStartedAt = performance.now(); return }
        // desktop anchors on the down event and records the pressed cell straight away
        const node = resolveDragNode(e.target as HTMLElement | null)
        if (node) { dragRecordCell(node) }
    }
    // sweep: record each crossed cell, but only inside an active drag.
    const sweep = (e: Event) => {
        if (!sweepMode.value) {
            return
        }
        const node = resolveDragNode(e.target as HTMLElement | null)
        if (node) { dragRecordCell(node) }
    }
    for (const ev of DRAG_DOWN_EVENTS) { el.addEventListener(ev, start) }
    for (const ev of DRAG_ROW_EVENTS) { el.addEventListener(ev, sweep) }
    // lift: finalize the in-progress region once on lift-off. Mouse users fire `mouseup`;
    // touchusers fire `pointerend`.
    for (const ev of DRAG_LIFT_EVENTS) {
        el.addEventListener(ev, (e) => {
            const dt = table.value?.dt as any
            if (dt) { dragFinalize(dt, e) }
        })
    }
}
// listeners live on the stable table node so they need no rebuild; just ensure dt is ready.
function dragWireTableInit() { nextTick(() => { const dt = table.value?.dt as any; if (dt) { dragWireTable() } }) }
dragWireTableInit()
// call again after a draw to re-anchor listeners in case the whole table node was replaced
// (reloaded). Idempotent per node via the WeakSet guard.
let selectionChangedDisabled = false;
watch([() => table.value?.dt], () => { dragWireTable() }, { immediate: true })
function selectionChanged(ignoreFocused?: boolean) {
    if (table.value && !selectionChangedDisabled) {
        selectionChangedDisabled = true;
        using _ = disposeBy(() => selectionChangedDisabled = false)
        const focused = table.value.dt.cell('.focused')
        // convert rows to cells
        const selectedRows = table.value.dt.rows({ selected: true })
        //table.value.dt.cells(selectedRows.indexes() as any, table.value.dt.columns()[0]).select()
        selectedRows.deselect()// deselect rows selected by keyboard

        if (!ignoreFocused) {
            focused.select()
        }

        selection.value = table.value.dt.cells({ selected: true })
        // resolve selected rows
        const rows = new Set<number>()
        selection.value.each?.((value: CellIdx[]) => {
            for (const cell of value) {
                rows.add(cell.row)
            }
        })

        $('.' + selectedRow).removeClass(selectedRow)
        table.value.dt.rows([...rows]).nodes().each(n => n.classList.add(selectedRow))

        if (selection.value[0].length) {
            $('.selected-only').removeClass('disabled')
        } else {
            $('.selected-only').addClass('disabled')
        }
    }
}
function openEditLink() {
    const row = selection.value?.[0][0].row
    if (typeof row != undefined) {
        const link = (table.value?.dt.row(row).data() as typeof data.value[number]).editLink
        if (link) {
            window.open(link, '_blank', 'noopener,noreferrer')
        }
    }
}

function copySelected() {
    const cells = table.value?.dt.cells({ selected: true }).data().toArray().filter(c => !!c).map(c => `"${c.toString().replaceAll('"', '""')}"`)
    if (cells && cells.length) {
        const text = cells.length > 1 ? cells.join(',') : cells[0]
        navigator.clipboard.writeText(text)
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
    if ((selection.value?.data()?.length ?? 2) > 1) {
        alert('Vyberte jednu buňku')
        return
    }
    const ids = selection.value!.indexes()
    const response = table.value?.dt.row(ids[0].row).data() as unknown as typeof data.value[number]//DT has bad return type definition
    let col = table.value?.dt.column(ids[0].column).dataSrc()
    if (typeof col != 'string' || !response) {
        alert('Tuto buňku nelze upravit')
        return
    }
    const doc = responseDoc(response.id)
    const selData = selection.value!.data()
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

function changeState(state: ApplicationState) {
    const id = selection.value?.data()?.[0].id
    if (!id) {
        return
    }
    setDocT(responseDoc(id), {
        state,
    } as ResponseRecord, { merge: true })
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
    const toRemove = Object.keys(availableQuestions.value).filter((a: any) => Object.entries(applications.settings?.fields ?? {}).some(([k, v]) => (typeof v == 'number' && v == a) || (v == availableQuestions.value[a].title && !SpecialApplicationFields.includes(k as any))))
    return [
        {
            text: useIconEl('eye') + ' Odkrýt sloupce',
            extend: 'collection',
            buttons: toAdd.value.length ? [{
                text: useIconEl('check-all') + ' Všechny',
                action() {
                    table.value?.dt.columns('.undescribed').visible(true)
                },
            }, {
                extend: 'spacer',
            }].concat(toAdd.value.map((id: any) => ({
                text: `${availableQuestions.value[id].multi ? (useIconEl('format-list-bulleted') + ' ') : ''}${availableQuestions.value[id].title}`,
                action() {
                    if (expandMultiple.value && availableQuestions.value[id].multi) {
                        for (const v of availableQuestions.value[id].values) {
                            table.value?.dt.column(`${id}.${simpleHash(v)}:name`).visible(true)
                        }
                    } else {
                        table.value?.dt.column(`${id}:name`).visible(true)
                    }
                    undescribedVisible.add(id)
                },
            }))) : [{
                text: '&ensp;V tabulce jsou již všechny otázky z přihlášky&ensp;',
                extend: 'spacer',
                style: 'empty',
            }],
        }, {
            text: useIconEl('eye-off') + ' Odebrat sloupec',
            titleAttr: 'Odebere natrvalo sloupec pro všechny uživatele',
            extend: 'collection',
            buttons: toRemove.length ? [{
                text: useIconEl('remove') + ' Všechny',
                action() {
                    table.value?.dt.columns('.undescribed').visible(false)

                },
            }].concat(toRemove.map((id: any) => ({
                text: availableQuestions.value[id].title,
                action() {
                    table.value?.dt.column(`${id}:name`).visible(true)
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
const statesWokeUp = ref(false)
const checkedIcon = 'checkbox-marked-outline'
const uncheckedIcon = 'checkbox-blank-outline'
//DataTables has no checkbox button, so each toggle is a custom button whose icon reflects the current (un)checked state.
function toggleCheckbox(config: ButtonConfig, checked: boolean) {
    return {
        text: checked
            ? (useIconEl(checkedIcon) + '&nbsp;' + config.text)
            : (useIconEl(uncheckedIcon) + '&nbsp;' + config.text),
        action: (e: JQuery.Event,
            dt: Api<typeof data.value>,
            node: JQuery,
            config2: ButtonConfig, callback: VoidFunction) => {

            const icon = node.find('.icon')
            const style = icon.attr('style') ?? ''
            icon.attr('style', style.replace(checked ? checkedIcon : uncheckedIcon, checked ? uncheckedIcon : checkedIcon))
            config.action?.(e, dt, node, config2, callback as any)
        },
    }
}
const buttons
    = computed(() => [
        {
            extend: 'savedStates',
            text: useIconEl('eye') + ' Zobrazení',
            buttons: [
                //Zobrazit i zrušené
                toggleCheckbox({
                    text: 'Zobrazit i zrušené',
                    titleAttr: 'Ovládá, zdali mají být zobrazeny zrušené a odmitné přihlášky',
                    action() { applications.includeCancelled = !applications.includeCancelled },
                }, applications.includeCancelled),
                //Rozbalovací řádky
                toggleCheckbox({
                    text: 'Rozbalovací řádky',
                    titleAttr: 'Ovládá, zdali mají být řádky rozbaleny podle délky',
                    action() { responsive.value = !responsive.value },
                }, responsive.value),
                //Zaškrtávací políčka zvlášť
                toggleCheckbox({
                    text: 'Zaškrtávací políčka zvlášť',
                    titleAttr: 'Otázky z formuláře, které obsahovaly zaškrtávací políčka, budou zobrazeny jako více sloupců',
                    action() { expandMultiple.value = !expandMultiple.value },
                }, expandMultiple.value),
                //České datumy
                toggleCheckbox({
                    text: 'České datumy',
                    titleAttr: 'Ovládá formát českých datumů (DD. MM. vs YYYY-MM-DD)',
                    action() { czechDates.value = !czechDates.value },
                }, czechDates.value),
                ...visibilityButtons,
                ...questionControlColumns.value,
                { extend: 'colvis', text: 'Sloupce', columns: ':not(.always-visible)' },
                { extend: 'spacer', style: 'bar' },
                {
                    extend: 'createState', text: 'Uložit zobrazení', action: function (e, dt, node, config, cb) {
                        statesWokeUp.value = true
                        app.$DataTable.value!.ext.buttons.createState.action?.(e, dt, node, config, cb)
                    } as ButtonConfig['action'],
                },
                {
                    extend: 'removeAllStates', text: 'Smazat uložená zobrazení', action: function (e, dt, node, config, cb) {
                        statesWokeUp.value = true
                        app.$DataTable.value!.ext.buttons.removeAllStates.action?.(e, dt, node, config, cb)
                    } as ButtonConfig['action'],
                },
                { extend: 'spacer', style: 'bar' },
                //Workaround for states buttons do not load at first run
                ...((!statesWokeUp.value ? (table.value?.dt?.stateRestore?.states() as any)?.toArray()?.map((s: StateRestore) => ({
                    text: s.s.identifier,
                    split: ['updateState', 'renameState', 'removeState'],
                    _stateRestore: s,
                    action() {
                        table.value!.dt.stateRestore.state(s.s.identifier)!.load()
                    },
                })) : undefined) ?? []),
            ],
        }, ...(cloud.resolvedPermissions.editSchedule ? [{
            text: useIconEl('edit'),
            titleAttr: 'Upravit hodnotu pro zobrazení (neovlivní původní data v přihlášce)',
            className: 'selected-only disabled',
            action: editOverlay,
            split: [
                {
                    text: useIconEl('edit') + ' Upravit přihlášku',
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
            ]
        }] : []), {
            text: useIconEl('content-copy'),
            className: 'selected-only disabled',
            titleAttr: 'Zkopíruje všechny vybrané buňky do schránky. Pokud je vybráno více buněk v jednom řádku, budou sloučeny do jedné buňky oddělené čárkou.',
            action: copySelected,
            split: [{
                text: useIconEl('checkbox-multiple-marked-outline') + ' Vše',
                titleAttr: 'Vybrat všechny',
                action: selectAll,
            }, {
                text: useIconEl('checkbox-blank-off-outline') + ' Zrušit',
                titleAttr: 'Zrušit výběr',
                action: deselect,
            },
            ],
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
                {
                    text: 'Export',
                    extend: 'collection',
                    buttons: [{
                        text: useIconEl('code-braces') + ' JSON',
                        action: exportJson,
                    }, {
                        text: useIconEl('file-document-arrow-right') + ' CSV',
                        action: exportCSV,
                    },
                    ],
                },
            ],
        }, {
            extend: 'collection',
            text: '<span class=\'noinvert\'>🗒️</span> Formulář',
            autoClose: true,
            buttons: [
                {
                    text: useIconEl('gear') + ' Nastavení registrace',
                    action: goToFormSettings,
                },
                {
                    text: useIconEl('edit') + ' Upravit formulář',
                    action: goToFormEdit,
                },
                {
                    text: useIconEl('show') + ' Zobrazit přihlášku',
                    action: goToFormResponsePage,
                },
                {
                    text: useIconEl('table-eye') + ' Zobrazit Google tabulku',
                    action: goToSpreadsheet,
                },
                {
                    text: useIconEl('cog-refresh') + ' Aktualizovat data z formuláře',
                    titleAttr: 'Stáhne všechny odeslané přihlášky a jejich změny do interní databáze',
                    action: refresh,
                }, ...questionControlColumns.value,
            ],
        },
    ])

function goToFormEdit() {
    navigateTo(cloud.eventDescription?.formDocument, { external: true, open: { target: '_blank' } })
}

function goToFormResponsePage() {
    navigateTo(cloud.eventDescription?.form, { external: true, open: { target: '_blank' } })
}
async function goToSpreadsheet() {
    if (!cloud.eventDescription?.formDocument) {
        alert('FormID není')
        return
    }
    const gapi
        = useGapi()
    const client = await gapi.client()
    const infoRequest = await client.forms.forms.get({
        formId: extractFormIdFromURL(cloud.eventDescription.formDocument)!,
        fields: 'linkedSheetId',
    })
    if (infoRequest.result.linkedSheetId) {
        navigateTo(`https://docs.google.com/spreadsheets/d/${infoRequest.result.linkedSheetId}`, { external: true, open: { target: '_blank' } })
    } else {
        alert('Tento formulář nemá přiřazenou google tabulku')
    }
}

function goToFormSettings() {
    navigateTo(formSettings.value)
}

function selectAll() {
    table.value?.dt.cells({ page: 'all' }).select()
}

function deselect() {
    table.value?.dt.rows().deselect()
    table.value?.dt.cells().deselect()
}

function selectedMapped(pickKeys?: (val: typeof data.value[number], key: string) => boolean) {
    const selected = selection.value?.data() ?? table.value?.dt.rows().data()
    return selected?.toArray().map((o: typeof data.value[number]) => pickBy(o, pickKeys ?? ((_, key) => {
        const a = applications.filtered.find(a => a.id == o.id)!
        return key in a
    })))
}

function exportFileName(extension: string) {
    return `${cloud.selectedEvent}-applications-${new Date().toLocaleString(navigator.language, { timeStyle: 'short', dateStyle: 'short' }).replace(':', '-')}.${extension}`
}

function exportJson() {
    const m = selectedMapped()
    download(exportFileName('json'), JSON.stringify(toRaw(m)))
}

function exportCSV() {
    const m = selectedMapped(val => ['string', 'number', 'boolean'].includes(typeof val))
    const cols = table.value?.dt.columns()
    const dataSrcs = cols?.dataSrc() ?? []
    const titles = cols?.titles() ?? []
    csvExport(exportFileName('csv'), (m as any) ?? [], cols?.[0].map((i: number) => ({ key: dataSrcs[i], displayLabel: titles[i] })))
}

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


function renderBool(data: boolean) {
    return data ? '✔' : ''
}
function renderMultiBool(data: string[], type: string, row: string[]) {
    if (typeof data == 'string') {
        return ellipsis.value(data, type, row)
    }
    if (Array.isArray(data)) {
        return data?.map(d => ellipsis.value(d, type, row)).join(',<br>')
    }
    return data
}
const undescribedVisible = new Set<string>()
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
/**
 * Random hash function for creating identifiers for individual checkbox question responses
 */
function simpleHash(s: string) {
    let hash = 0
    for (let i = 0; i < s.length; i++) {
        hash = (hash << 5) - hash + s.charCodeAt(i)
        hash |= 0
    }
    return hash
}

watchThrottled([responsive, columns, czechDates],
    (newVal, oldVal) =>
        (!loadedDt.value || !app.$DataTable || isMatchWith(oldVal, newVal, (val) =>
            typeof val == 'function' ? true : undefined)) ? null : reload(), { throttle: 500 })

onMounted(() => setTimeout(() => {
    if (!showTable.value) {
        showTable.value = true
    }
}, 800))

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

#applications td {
    user-select: none;
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

.filtered .dtcc-button-icon line {
    stroke: orange
}

.selected-row {
    position: relative;

    &::after {
        content: '';
        position: absolute;
        inset: 0;
        z-index: -1;
        background: linear-gradient(to right, #00000023, transparent)
    }
}
</style>
