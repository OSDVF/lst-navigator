import type { ApiCellsMethods, CellIdx } from 'datatables.net-dt'
import type { Table } from './tableUtils'

export function useTableContextMenu<T>(table: Table<T[]>, selectedCell: Ref<ApiCellsMethods<T[]> | undefined>, cancelDrag?: () => void) {
    /** ui.overlayEnabled = true must be set before the context menu opens */
    const contextMenuState = ref<{ x: number, y: number, open: boolean, column: string }>({ x: 0, y: 0, open: false, column: '' })
    const ui = useUI()

    function contextMenu(e: MouseEvent) {
        e.preventDefault()
        const cell = (e.target as HTMLElement).closest('td')
        if (cell instanceof HTMLTableCellElement && '_DT_CellIndex' in cell) {
            const idx = (cell._DT_CellIndex as CellIdx)
            const row = table.value?.dt.row(idx.row)
            if (row) {
                const indexes = selectedCell.value?.indexes().toArray()// ensure the cell with the context menu is selected or select it
                if (!selectedCell.value?.length || !indexes!.some(i => i.row == idx.row && i.column == idx.column)) {
                    table.value!.dt.rows().deselect()
                    table.value!.dt.cells().deselect()
                    table.value!.dt.cell(cell).select()
                }
                ui.overlayEnabled = true
                contextMenuState.value = { x: e.clientX, y: e.clientY, open: true, column: table.value!.dt.column(idx.column).dataSrc().toString() }
                if (cancelDrag) {
                    nextTick(cancelDrag)
                }
            }
        }
    }

    return {
        contextMenu,
        contextMenuState,
    }
}
