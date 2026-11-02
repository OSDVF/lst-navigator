import type { ButtonConfig, Api, ApiCellsMethods } from 'datatables.net-dt'
import type { DocumentReference } from 'firebase/firestore'
import type { ApplicationState, ResponseRecord } from '~/form-connector/src/responses'
import type { Table } from '~/utils/table/tableUtils'
import type StateRestore from 'datatables.net-staterestore/types/StateRestore'
import pickBy from 'lodash.pickby'
import { SpecialApplicationFields } from '~/types/cloud'
import { toggleCheckbox, simpleHash } from '~/utils/table/render'
import { setDoc as setDocT } from '~/utils/trace'

export type AvailableQuestions = Record<number, { title: string, values: Set<string>, multi: boolean, }>

export function useApplicationsTableButtons<T extends { id: string }>(
    table: Table<T[]>,
    selecting: Ref<boolean>,
    contextMenuOpen: Ref<boolean>,
    applications: ReturnType<typeof useApplications>,
    selectedCell: Ref<ApiCellsMethods<T> | undefined>,
    selectedRowsData: Ref<T[] | undefined>,
    selectedRowClass: string,
    responseDoc: (id: string) => DocumentReference,
    refresh: () => void,
    openEditLink: () => void,
    editOverlay: () => void,
    deselect: () => void,
    signRow: (id: string, existing: string) => void,
) {
    const app = useNuxtApp()

    const cloud = useCloudStore()
    const responsive = useLocalStorage('responsive', false)
    const expandMultiple = useLocalStorage('expandMultiple', true)
    const czechDates = useLocalStorage('czechDates', false)
    const formSettings = computed(() => `/${cloud.selectedEvent}/admin/events/form`)

    const hasTouchscreen = ref(false)

    onMounted(() => {
        hasTouchscreen.value = window.matchMedia('(any-pointer: coarse)').matches
    })

    const availableQuestions = computed(() => {
        const result: AvailableQuestions = {}
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

    const buttons = computed(() => [
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
        }, ...(hasTouchscreen.value ? [{
            text: useIconEl(selecting.value ? 'selection-remove' : 'selection-drag'),
            titleAttr: selecting.value ? 'Přestat vybírat' : 'Vybrat buňky',
            action() { selecting.value = !selecting.value },
        }] : []), ...(cloud.resolvedPermissions.editSchedule ? [{
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
                }, {
                    text: useIconEl('signature-freehand') + ' Podepsat',
                    action: () => {
                        const rows = table.value?.dt.rows('.' + selectedRowClass)
                        const data = rows?.data()[0]
                        if (data) {
                            signRow(data.id, data.signature)
                        }
                    },
                },
            ],
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

    const statesWokeUp = ref(false)

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
    function selectedMapped(pickKeys?: (val: T, key: string) => boolean) {
        const selected = selectedCell.value?.data() ?? table.value?.dt.rows().data()
        return selected?.toArray().map((o: any) => pickBy(o, pickKeys ?? ((_, key) => {
            const a
                = applications.filtered.find(a => a.id == o.id)!
            return key in a
        })))
    }

    function changeState(state: ApplicationState) {
        contextMenuOpen.value = false
        if (!selectedRowsData.value) {
            return
        }
        for (const row of selectedRowsData.value) {
            setDocT(responseDoc(row.id), {
                state,
            } as ResponseRecord, { merge: true })
        }
    }

    function copySelected() {
        const cells = table.value?.dt.cells({ selected: true }).data().toArray().filter(c => !!c).map(c => `"${c.toString().replaceAll('"', '""')}"`)
        if (cells && cells.length) {
            const text = cells.length > 1 ? cells.join(',') : cells[0]
            navigator.clipboard.writeText(text)
        }
    }

    const undescribedVisible = new Set<string>()

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


    return {
        buttons,
        responsive,
        expandMultiple,
        czechDates,
        formSettings,
        toAdd,
        availableQuestions,
        undescribedVisible,
        changeState,
    }
}

function allVisible(_: any, dt: Api<any>) {
    dt.columns().visible(true)
}
function basicColumns(_: any, dt: Api<any>) {
    dt.columns('.print').visible(true)
    dt.columns(':not(.print, .always-visible)').visible(false)
}
