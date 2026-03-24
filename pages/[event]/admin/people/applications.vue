<template>
    <div>
        <DataTable
            :options="{ paging: false }" :data="applications.filteredMapped.map(a => ({
                ...a.record,
                ...Object.fromEntries(Object.keys(a.mapped ?? {}).filter(k => typeof k == 'string').map(k => [k, a.mapped![k] ?? '']))
            }))" />
    </div>
</template>

<script lang="ts" setup>
definePageMeta({
    title: 'Přijaté přihlášky',
})

const applications = useApplications()

</script>