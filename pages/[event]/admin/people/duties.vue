<template>
    <ProgressBar v-if='cloud.eventLoading' />
    <div v-else-if="cloud.resolvedPermissions.showApplications">
        <LazyDataTable />
    </div>
    <article v-else>
        Nemáte práva na zobrazení této stránky.
    </article>
</template>

<script setup lang="ts">
definePageMeta({
    title: 'Služby',
    layout: 'admin',
    middleware: ['auth'],
})

const cloud = useCloudStore()
</script>