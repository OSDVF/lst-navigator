<template>
    <div>
        <div role="list" class="schedule">
            <details
                v-for="(entry, index) in selectedProgram" :key="`e${index}`" role="listitem"
                :style="{ '--color': entry.color }"
            >
                <summary>
                    <span class="align-top mr-1">
                        {{ toHumanTime(entry.time) }}
                    </span>
                    <div class="inline-block">
                        <h4>{{ entry.title }}</h4>
                        <h5 v-if="entry.subtitle">
                            {{ entry.subtitle }}
                        </h5>
                    </div>
                </summary>
                <div>
                    <IconCSS class="icon" :name="entry.icon ?? 'mdi:chevron-right'" />
                    <!-- eslint-disable-next-line vue/no-v-html -->
                    <span class="content" v-html="entry.description ?? 'Žádné detaily'" />
                </div>
            </details>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useCloudStore } from '@/stores/cloud'
const route = useRoute()
const selectedPart = computed(() => typeof route.params.schedulePart === 'string' ? parseInt(route.params.schedulePart) : 0)
const selectedProgram = computed(() => cloudStore.scheduleParts ? cloudStore.scheduleParts[selectedPart.value]?.program : [])
const cloudStore = useCloudStore()

// Format: 1700 => 17:00
function toHumanTime(time: number) {
    const hours = Math.floor(time / 100)
    const minutes = time % 100
    return `${hours}:${minutes.toString().padStart(2, '0')}`
}

</script>

<style lang="scss">
.schedule {
    &>div {

        // even-odd background
        &:nth-child(odd) {
            backdrop-filter: brightness(0.9);
        }
    }
}

details {
    background: var(--color);

    .icon {
        margin-left: 2.9rem;
    }
    .content {
        display: inline-block;
        margin: .5rem .5rem .5rem .2rem;
    }
}

summary {
    cursor: pointer;
    background: transparent;
    transition: background .15s ease;
    padding: .5rem;

    &:hover {
        background: #0001;
    }

    &::marker {
        content: '';
    }

    h4 {
        margin: 0;
        display: inline;
    }

    h5 {
        margin: 0;
    }
}
</style>
