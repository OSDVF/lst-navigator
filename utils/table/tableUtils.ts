import type { Api } from '~/types/datatables'
import type { ApiCellsMethods, CellIdx } from 'datatables.net-dt'

export type Table<T> = Ref<{ dt: Api<T>} | null >

/**
 * DataTable filtering, searching, selection, and visual cleanup utils
 * Requires a element with ref 'navigation' */
export function useTableUtils<T>(table: Table<T>) {
    const filteredBy = ref<Record<number, string[]>>({})
    const loadedDt = ref(false)
    const keyboardVisible = inject<Ref<boolean>>('keyboardVisible')
    const navigation = inject<Ref<HTMLDivElement | null>>('navigation')
    const navigationSize = useElementSize(navigation, undefined, { box: 'border-box' })
    const windowSize = useWindowSize()
    const layoutRowHeight = ref(30)
    const scrollY = computed(() => (windowSize.height.value - navigationSize.height.value - layoutRowHeight.value - 120))
    const isSearching = ref(false)

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

    const sweepMode = ref(false)
    const selectedRowClass = 'selected-row'
    const selectedCell
        = ref<ApiCellsMethods<T>>()
    const selectedRowsData = ref<T>()
    let selectionChangedDisabled = false
    watch([() => table.value?.dt], () => { dragWireTable() }, { immediate: true })
    function selectionChanged(ignoreFocused?: boolean) {
        if (table.value && !selectionChangedDisabled) {
            selectionChangedDisabled = true
            using _ = disposeBy(() => selectionChangedDisabled = false)
            const focused = table.value.dt.cells('.focus')
            // convert rows to cells
            const selectedRows = table.value.dt.rows({ selected: true })
            //table.value.dt.cells(selectedRowClasss.indexes() as any, table.value.dt.columns()[0]).select()
            selectedRows.deselect()// deselect rows selected by keyboard

            if (!ignoreFocused) {
                focused.select()
            }

            selectedCell.value = table.value.dt.cells({ selected: true })
            // resolve selected rows
            const rows = new Set<number>()
            selectedCell.value.each?.((value: CellIdx[]) => {
                for (const cell of value) {
                    rows.add(cell.row)
                }
            })

            $('.' + selectedRowClass).removeClass(selectedRowClass)
            const rowsApi = table.value.dt.rows([...rows])
            rowsApi.nodes().each(n => n.classList.add(selectedRowClass))
            selectedRowsData.value = rowsApi.data().toArray() as T

            if (selectedCell.value[0].length) {
                $('.selected-only').removeClass('disabled')
            } else {
                $('.selected-only').addClass('disabled')
            }
        }
    }

    function deselect() {
        table.value?.dt.rows().deselect()
        table.value?.dt.cells().deselect()
    }

    // --- Drag area selection (plain HTML DOM events) --------------------------------------
    // As the hand sweeps across the rendered table, a "pass-over" event fires on every cell
    // node it crosses. Desktop uses mouse events (`mouseover`); touchscreens use pointer
    // events (`pointerover`) — so we listen on both families to cover keyboard + touchscreen.
    // We attach on the stable table element so swept cells are recorded by coordinate; the
    // lift-off event (`mouseup` / `pointerend`) ends the region and commits the cell block to a
    // persistent set of "row|column" keys that accumulate ("multiple areas") across drags.

    // pressed cell indices [row,column] swept during a drag and persisted across drags (multiple areas)
    const dragKeys: Array<[number, number]> = []  // dragged cells, committed on lift-off; deduped on insert
    let dragActive = false               // a drag is in progress; sweeps before it are ignored
    const selecting = ref(false)
    // commit pressed indices as an exact per-cell union (grouped by row so each `.select()` hits
    // exactly those cells in the row). Multiple `.select()` calls union into DataTables' selected
    // state, and persisted keys across drags keep disconnected areas. selectionChanged re-syncs the
    // CSS from that state. Indices were resolved at start/record, so this just groups them — no cell
    // re-resolution here. Fires on lift-off only.
    function dragFinalize(dt: Api<T>, e: PointerEvent) {
        if (!dragKeys.length) { dragActive = false; return }
        if (sweepMode.value) {
            for (const [r, col] of dragKeys) {
                dt.cells(r, col).select()
            }
        } else {
            const node = resolveDragNode(e)
            if (node) { dragRecordCell(node) }

            const bb = boundingRect(dragKeys)
            const cols = [...new Array(bb.maxCol - bb.minCol + 1).keys().map(k => k + bb.minCol)]
            const clear = !e.shiftKey && !e.ctrlKey && !selecting.value

            const sel = selectedCell.value?.toArray()
            const selectedSingle = dragKeys.length == 1
                && sel?.some((ss: CellIdx[]) => ss.find((s: CellIdx) => s.row == dragKeys[0][0]))
                && sel.some((ss: CellIdx[]) => ss.find((s: CellIdx) => s.column == dragKeys[0][1]))
            if (clear) {
                dt.cells({ page: 'all' }).deselect()
                dt.rows({ page: 'all' }).deselect()
            }
            if (selectedSingle) {// deselect single already selected cell
                // TODO togglable selection for multiple cell areas
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
        dragActive = false
    }
    // record a pressed cell's index [row,column] during an active drag. The down seeds the first
    // index; sweeps add more — cells resolve here, never at finalize. Sweeps before the down event
    // (e.g. incidental pointer sweeps while not dragging) are ignored.
    function dragRecordCell(node: HTMLTableCellElement) {
        if (!dragActive) { return }

        const idx = dragResolveCell(table.value!.dt as any, node)
        if (!idx || idx.row < 0 || idx.column < 0) { return }
        if (!dragHasKey(idx.row, idx.column)) {
            dragKeys.push([idx.row, idx.column])
            $(table.value!.dt.table().node()).find('.focus').removeClass('focus')
            node.classList.add('focus')
        }
    }
    // attach all drag listeners once to the whole table element instead of per row node.
    // A drag is a three-part gesture on DOM events:
    //   * DOWN  `pointerdown`: the moment the user places their finger/hand on
    //           the screen. This anchors the touch-clock and seeds the first cell so the region
    //           begins from where they start, not from an ambiguous `-over`.
    //   * ROW   `pointerover`: every cell swept over between down and lift;
    //           recorded only while a drag is active.
    //   * LIFT  `pointerup`: ends the region and commits the cell block exactly
    //           once. Keeping listeners on the one stable table node means no per-draw rebuild.
    const dragTableHooked = new WeakSet<HTMLElement>()

    function dragWireTable() {
        const el = table.value?.dt?.table()?.node() as HTMLElement | null
        if (!el || typeof el.addEventListener !== 'function' || dragTableHooked.has(el)) { return }
        dragTableHooked.add(el)
        // down: start a drag. Anchor the touch-clock here (not on the first `-over`) so incidental
        // sweeps while not dragging are ignored, and seed the starting cell into the region.
        const start = async (e: PointerEvent) => {
            const node = resolveDragNode(e)
            if (e.pointerType != 'mouse' && !selecting.value) {
                if (node) {
                    selectionChangedDisabled = true
                    deselect()
                    table.value!.dt.cell(node).select()
                    selectionChangedDisabled = false
                }
                return
            }
            dragActive = true
            // desktop anchors on the down event and records the pressed cell straight away
            if (node) { dragRecordCell(node) }
        }
        // sweep: record each crossed cell, but only inside an active drag.
        const sweep = (e: PointerEvent) => {
            if (!sweepMode.value && !selecting.value) {
                return
            }
            const node = resolveDragNode(e)
            if (node) { dragRecordCell(node) }
        }
        el.addEventListener('pointerdown', start)
        el.addEventListener('pointerenter', sweep)
        // lift: finalize the in-progress region once on lift-off
        el.addEventListener('pointerup', (e) => {
            const dt = table.value?.dt as any
            if (dt) { dragFinalize(dt, e) }
        })

    }
    // does this exact [row,column] already appear in dragKeys? (arrays compare by value, not reference)
    function dragHasKey(r: number, c: number): boolean {
        for (const k of dragKeys) { if (k[0] === r && k[1] === c) { return true } }
        return false
    }

    // listeners live on the stable table node so they need no rebuild; just ensure dt is ready.
    function dragWireTableInit() { nextTick(() => { const dt = table.value?.dt as any; if (dt) { dragWireTable() } }) }
    dragWireTableInit()

    function cancelDrag() {
        dragKeys.splice(0)
        dragActive = false
    }

    return {
        cancelDrag,
        loadedDt,
        isSearching,
        filteredBy,
        scrollY,
        selecting,
        selectedCell,
        selectedRowsData,
        selectedRowClass,
        sweepMode,
        selectionChanged,
        deselect,
    }
}

function dragResolveCell(dt: any, node: HTMLElement): { row: number; column: number } | null {
    const tr = node.closest?.('tr') as HTMLElement | null
    if (!tr) { return null }
    // the rendered cell node carries its column index (_DT_CellIndex), so we can select cells individually
    const cell = (node instanceof HTMLTableCellElement ? node : node.closest?.('td') as HTMLTableCellElement | null) as HTMLTableCellElement | null
    if (!cell || !('_DT_CellIndex' in cell)) { return null }
    return (cell as any)._DT_CellIndex
}
function resolveDragNode(e: PointerEvent) {
    const node = document.elementFromPoint(e.clientX, e.clientY)?.closest('td') ?? (e.target as HTMLElement)?.closest('td')
    return node instanceof HTMLTableCellElement ? node : null
}
