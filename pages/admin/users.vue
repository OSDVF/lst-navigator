<template>
    <article>
        <ClientOnly>
            <Component
                :is="DataTable"
                ref="table" :data="usersIndexed" :options="{
                    order: [[1, 'asc']],
                    select: true
                }" :columns="[
                    {
                        searchable: false,
                        orderable: false,
                        render: (data: string) => `<img class='noinvert' width='24px' referrerPolicy='no-referrer' crossorigin='anonymous' src='${data}' />`
                    },
                    null,
                    null,
                    null,
                    null,
                    null,
                    {
                        render: (data: string) => `<span title='${data}' class='icon' style='mask-image: url(https://api.iconify.design/mdi/${({
                            super: 'shield-lock-open', event: 'calendar-check', admin: 'account-lock-open'
                        })[data]}.svg);'></span>`
                    }
                ]"
            >
                <thead>
                    <tr>
                        <th />
                        <th>ID</th>
                        <th>Účet</th>
                        <th>Podpis</th>
                        <th>Posední přihlášení</th>
                        <th>Poslední feedback</th>
                        <th>Oprávnění</th>
                    </tr>
                </thead>
            </Component>
        </ClientOnly>
    </article>
</template>

<script setup lang="ts">
import type { Api } from 'datatables.net'
import { knownCollection, useCloudStore } from '@/stores/cloud'
import { UserInfo } from '@/types/cloud'

definePageMeta({
    title: 'Uživatelé',
    middleware: ['auth'],
    layout: 'admin'
})

const cloudStore = useCloudStore()
const permissionError = ref()
const users = useCollection<UserInfo>(knownCollection(useFirestore(), 'users'), { maxRefDepth: 0, onError(e: any) { permissionError.value = e } })

const usersIndexed = computed(() => {
    const result = []
    if (users.value) {
        for (const user of users.value) {
            const effectiveSignature = user.signature[cloudStore.selectedEvent] || user.signatureId[cloudStore.selectedEvent]
            const values = [
                user.photoURL,
                user.id,
                user.name,
                effectiveSignature,
                new Date(user.lastLogin).toLocaleString(),
                cloudStore.feedback.online?.[effectiveSignature] ?? 'Nikdy',
                user.permissions.superAdmin === true ? 'super' : user.permissions[cloudStore.selectedEvent]
            ]
            result.push(values)
        }
    }
    return result
})

/* const table = ref<{dt:Api<typeof usersIndexed.value>}>()
watch(table, (table) => {
    if (table) {
        table.dt.column('1').order('asc')// Default order by user uid
    }
}) */
const DataTable = shallowRef()
onMounted(() => {
    const dtModule = import('datatables.net-vue3')
    const selectModule = import('datatables.net-select')
    const buttonsModule = import('datatables.net-buttons')
    const responsiveModule = import('datatables.net-responsive')
    dtModule.then(async (module) => {
        const Select = await selectModule
        const Buttons = await buttonsModule
        const Responsive = await responsiveModule
        DataTable.value = module.default
        DataTable.value.use(Buttons.default)
        DataTable.value.use(Select.default)
        DataTable.value.use(Responsive.default)
    })
})
</script>

<style lang="scss">
.datatable {
    .icon {
        background: black;
        display: inline-block;
        width: 1.5rem;
        height: 1.5rem;
        mask-repeat: no-repeat;
        mask-size: 100% 100%;;
    }
}

</style>
