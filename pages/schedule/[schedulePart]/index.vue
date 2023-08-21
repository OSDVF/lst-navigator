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
                <NuxtLink :to="`/schedule/${selectedPart}/${index}`" style="position: relative">
                    <IconCSS
                        v-if="!(entry.description?.match('<p|<br|<ol|<ul') ?? false)" class="icon"
                        :name="entry.icon ?? 'mdi:chevron-right'"
                    />
                    <!-- eslint-disable-next-line vue/no-v-html -->
                    <span class="content" v-html="entry.description ?? 'Žádné detaily'" />
                    <span class="more">
                        <IconCSS class="icon" name="mdi:rss" />
                        <template v-if="!getFeedback(entry, index)">Feedback a detaily</template>
                        <NuxtRating
                            v-else :rating-value="getFeedback(entry, index)" rating-size="1.2rem"
                            inactive-color="#aaa" :title="`Tvé hodnocení: ${getFeedback(entry, index)}`"
                        />
                    </span>
                </NuxtLink>
            </details>
        </div>
    </div>
</template>

<script setup lang="ts">
import { doc } from 'firebase/firestore'
import { Feedback, FeedbackType, useCloudStore } from '@/stores/cloud'
import { useSettings } from '@/stores/settings'
import { toHumanTime } from '@/utils/types'
const route = useRoute()
const selectedPart = computed(() => typeof route.params.schedulePart === 'string' ? parseInt(route.params.schedulePart) : 0)
const selectedProgram = computed(() => cloudStore.scheduleParts ? cloudStore.scheduleParts[selectedPart.value]?.program : [])
const cloudStore = useCloudStore()
const settings = useSettings()

const firestore = useFirestore()
const currentFeedbackDoc = doc(firestore, `${cloudStore.eventDbName}/feedback`)
const currentFeedbackValue = useDocument(currentFeedbackDoc)

function getFeedback(entry: any, index: number) {
    const feedback: Feedback = currentFeedbackValue.value?.[selectedPart.value]?.[index]?.[settings.userIdentifier]
    if (!feedback) { return false }
    switch (entry.feedbackType as FeedbackType) {
    case 'basic':
        return feedback.basic
    case 'complicated':
        return feedback.complicated ? (feedback.complicated.reduce((prev, cur) => prev! + cur!, 0) ?? 0) / feedback.complicated.length : false
    }
    return false
}

</script>

<style lang="scss">
@import "@/assets/styles/constants.scss";

.schedule {
    &>div {

        // even-odd background
        &:nth-child(odd) {
            backdrop-filter: brightness(0.9);
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
}

details {
    background: var(--color);

    .content,
    .more {
        margin: .5rem;

        &>p:first-child {
            margin-top: 1.7rem;
        }

        p {
            margin: 1rem .5rem
        }

        &>ul {
            display: inline-block;
        }
    }

    .content {
        display: inline-block;
    }

    &>a {
        display: block;

        &>.icon {
            margin-left: 2.9rem;
        }
    }

    &:hover {
        .more {
            opacity: 1;
        }
    }

    ol li+li ul {
        margin-top: .5rem;
    }
}

.more {
    color: #1a476ac0;

    @media (hover: fine) {
        opacity: 0
    }

    position: absolute;
    right: 0;
    top:0;
    display: flex;
    align-items: center;
}
</style>
