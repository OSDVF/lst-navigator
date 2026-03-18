<template>
    <article role="article">
        <div class="eventBanner">
            <EventImage lightbox class="eventImage noinvert" :event="cloud.selectedEvent" />
        </div>
        <h1>{{ cloud.eventDescription?.title }}<NuxtLink
            v-if="cloud.resolvedPermissions.editEvent" class="ml-2"
            :to="`/${cloud.selectedEvent}/admin/events`" title="Nastavení událostí">
            <button type="button" class="large">
                <Icon name="mdi:pencil" class="baseline" /> Upravit
            </button>
        </NuxtLink>
            <NuxtLink v-if="cloud.visibleEvents.length > 1 || cloud.visibleEvents[0]?.id != cloud.selectedEvent" class="button small" style="float:right" to="/">
                <Icon name="mdi:apps" size="1.5rem" />
                <Icon name="mdi:arrow-left" />&ensp;Všechny události
            </NuxtLink>
        </h1>
        <h2>{{ cloud.eventDescription?.subtitle }}</h2>
        <h6>
            <a
                v-if="cloud.eventDescription?.web" :href="cloud.eventDescription.web" target="_blank"
                rel="noopener noreferrer">
                <Icon mode="svg" name="mdi:link" size="1rem" style="rotate:45deg" />&ensp;Oficiální web události <sup>
                    <Icon mode="svg" name="mdi:open-in-new" size="1rem" />
                </sup>
            </a>
            <template v-if="applicationsEnabled(cloud.eventDescription)">
                <br>
                <br>
                <a :href="cloud.eventDescription!.form" target="_blank" rel="noopener noreferrer">
                    <Icon mode="svg" name="mdi:form-select" size="1rem" />&ensp;Online přihláška <sup>
                        <Icon mode="svg" name="mdi:open-in-new" size="1rem" />
                    </sup>
                </a>
            </template>
            &ensp;
        </h6>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="text-invert" v-html="cloud.eventDescription?.description ?? 'Žádný popis'" />
    </article>
</template>

<script setup lang="ts">
const cloud = useCloudStore()
</script>

<style lang="scss">
.eventImage {
    object-fit: cover;
    max-width: 600px;
    display: block;
    margin: auto;
    border-radius: 8px;

    @media screen and (max-width: 600px) {
        max-width: 95%;
    }

    &:hover {
        cursor: pointer;
        filter: brightness(0.9);

        .dark &.noinvert {
            filter: brightness(0.9) invert(1);
        }
    }
}

.eventBanner {
    max-height: 50vh;
    overflow: hidden;
    position: relative;

    &::after {
        content: '';
        height: 2rem;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, rgb(255, 255, 255) 100%);
        position: absolute;
        bottom: 0;
        z-index: 2;
        left: 0;
        right: 0;
    }
}
</style>
