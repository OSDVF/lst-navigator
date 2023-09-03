<template>
    <article>
        <ClientOnly>
            <Component :is="DataTable" :data="users">
                <thead>
                    <tr>
                        <th>Účet</th>
                        <th>Podpis</th>
                        <th>Poslední feedback</th>
                        <th>Poslední poznámka</th>
                        <th>Oprávnění</th>
                    </tr>
                </thead>
            </Component>
        </ClientOnly>
    </article>
</template>

<script setup lang="ts">
import { UserInfo, knownCollection } from '@/stores/cloud'
import 'datatables.net-dt'
import 'datatables.net-buttons-dt'
import 'datatables.net-responsive-dt'
import 'datatables.net-select-dt'

const users = useCollection<UserInfo>(knownCollection(useFirestore(), 'users'), { maxRefDepth: 0 })

const dtModule = import('datatables.net-vue3')
const selectModule = import('datatables.net-select')
const buttonsModule = import('datatables.net-buttons')
const responsiveModule = import('datatables.net-responsive')
const DataTable = shallowRef()
dtModule.then(async (module) => {
    const Select = await selectModule
    const Buttons = await buttonsModule
    const Responsive = await responsiveModule
    DataTable.value = module.default
    DataTable.value.use(Buttons.default)
    DataTable.value.use(Select.default)
    DataTable.value.use(Responsive.default)
})
</script>
