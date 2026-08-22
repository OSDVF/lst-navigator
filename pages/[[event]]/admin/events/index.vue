<template>
    <ProgressBar v-if='cloud.eventLoading' />
    <div v-else-if="cloud.resolvedPermissions.editEvent">
        <NuxtLink v-if='cloud.resolvedPermissions.superAdmin' to="/admin/events/edit">
            <button>
                <Icon name='mdi:plus' /> Nová
            </button>
        </NuxtLink>
        <template
            v-if="isSelection && (cloud.resolvedPermissions.superAdmin || boolToNum(cloud.user.info?.permissions?.[getSelectedEvent(true)?.id ?? '']) >= UserLevel.Admin)">
            &ensp;
            <NuxtLink
                :to="{
                    name: 'event-admin-events-edit',
                    params: {
                        event: getSelectedEvent(true)?.id
                    }
                }">
                <button type="button">
                    <Icon name='mdi:pencil' /> Upravit
                </button>
            </NuxtLink>
            <button
                @click="maybe(getSelectedEvent(), e => $router.push(`/${cloud.selectedEvent}/admin/events/export`))">
                <Icon name='mdi:download' /> Export
            </button>
            <NuxtLink
                v-if="config.public.featureForms && maybe(getSelectedEvent(true), d => d.formDocument ?? d.form)?.startsWith(registrationFormDocumentPrefix)"
                :to="`/${getSelectedEvent(true)?.id}/admin/events/form`">
                <button type="button">
                    <Icon name="mdi:form-select" style="color: #7346ba" /> Nastavení registrace
                </button>
            </NuxtLink>
        </template>
        <button
            v-if="isSelection && getSelectedEvent(true)?.id != cloud.selectedEvent"
            @click="maybe(getSelectedEvent(), e => $router.push(`/${e.id}/admin/events`))">
            <Icon name="mdi:home-edit" /> Přepnout na událost
        </button>

        <button v-if='isSelection && cloud.resolvedPermissions.superAdmin' @click='deleteSelected'>
            <Icon name='mdi:trash-can' /> Smazat
        </button>
        &ensp;
        <span v-show="selectedTitle" class="button small" @click="deselect">
            <Icon name="mdi:select-off" />Zrušit označení
        </span>
        <LazyDataTable
            v-if="showTable" ref='table' :data='eventsIndexed' :options='{
                responsive: true,
                select: true,
                order: [[0, "desc"]]
            }' @select='selectionChanged' @deselect='selectionChanged'>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Titulek</th>
                    <th>Začátek</th>
                    <th>Konec</th>
                    <th v-if="cloud.resolvedPermissions.superAdmin && !admin.onlyTaggedEvents">Štítky</th>
                </tr>
            </thead>
        </LazyDataTable>
        <Teleport v-if="mounted && cloud.allTags.length" to="#topNav">
            <label>
                <input
                    v-model="admin.onlyTaggedEvents" type="checkbox"
                    @change="showTable = false; nextTick(() => showTable = true)"> Jen se štítkem <code>{{
                        config.public.filterTags
                    }}</code>
            </label>
        </Teleport>
    </div>
    <article v-else>
        Nedostatečná oprávnění
    </article>
</template>

<script setup lang='ts'>
import { doc, collection } from 'firebase/firestore'
import { deleteDoc } from '~/utils/trace'
import { EventSubcollectionsList, UserLevel, type EventDescription } from '~/types/cloud'

import type { Api } from '~/types/datatables'

definePageMeta({
    title: 'Správa akcí',
    layout: 'admin',
    middleware: ['auth'],
})

const admin = useAdmin()
const cloud = useCloudStore()
const lang = useLang()
const config = useRuntimeConfig()

const mounted = ref(false)
onMounted(() => mounted.value = true)

const eventsIndexed = computed(() => {
    const result = []
    if (cloud.eventsCollection) {
        for (const eventData of cloud.eventsCollection) {
            result.push([
                eventData.id,
                eventData.title + ((eventData.formDocument && extractFormIdFromURL(eventData.formDocument)) ? useIconEl('form-select', 'Má přihlášku', 'background: #7346ba;margin-left:.5rem') : ''),
                toJSDate(eventData.start)?.toLocaleDateString(lang.value),
                toJSDate(eventData.end)?.toLocaleDateString(lang.value),
                ...((cloud.resolvedPermissions.superAdmin && !admin.onlyTaggedEvents) ? [eventData.tags ?? ''] : ['']),
            ])
        }
    }
    return result
})

const showTable = ref(true)
const table = ref<{ dt?: Api<typeof eventsIndexed.value> }>()
const isSelection = ref(false)
const selectedTitle = ref<string>()

function selectionChanged() {
    if (table.value?.dt) {
        const data = table.value.dt.rows({ selected: true }).data()
        isSelection.value = data.length > 0
        selectedTitle.value = isSelection.value ? cloud.eventsCollection.find(e => e.id == data[0][0])?.title : undefined
    }

}
function deselect() {
    table.value?.dt?.rows().deselect()
    selectedTitle.value = undefined
    isSelection.value = false
}

function getSelectedEvent(silent = false): EventDescription<void> & { id: string } | undefined {
    if (!table.value?.dt) {
        if (!silent) {
            alert('Tabulka nenačtena')
        }
        return
    }
    const selectedData = table.value.dt.rows({ selected: true }).data()
    if (selectedData.length != 1) {
        if (!silent) {
            alert('Vyberte jednu akci')
        }
        return
    }
    return cloud.eventsCollection.find(e => e.id === selectedData[0][0])
}

const fs = useFirestore()
function deleteSelected() {
    if (table.value && fs) {
        const selectedEvent = getSelectedEvent()
        if (selectedEvent) {
            if (confirm(`Opravdu chcete smazat akci ${selectedEvent.title}?`)) {
                deleteDoc(doc(fs, 'events', selectedEvent.id))
                const keep = config.public.keepOrphanCollections.split(',')
                for (const col of EventSubcollectionsList.filter(a => !keep.includes(a))) {
                    deleteCollection(eventSubCollection(fs, selectedEvent.id, col))
                }

                deleteCollection(collection(fs, selectedEvent.id))// delete in the legacy doc tree
                deselect()
            }
        }
    }
}

</script>
