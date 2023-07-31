<template>
    <div>
        <nav role="navigation">
            <NuxtLink v-for="day in days" :key="day.name">{{ day.name }}</NuxtLink>
        </nav>
    </div>
</template>

<script setup lang="ts">

</script>
