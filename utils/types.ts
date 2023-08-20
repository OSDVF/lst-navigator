import type { ScheduleEvent } from '@/stores/cloud'

export type NotificationPayload = {
    title: string,
    body: string,
    image: string, // url
    icon: string// url,
    url: string// event page url e.g. /schedule/2/0
    time: number,
    date: string
}

// Format: 1700 => 17:00
export function toHumanTime(time?: number) {
    if (!time) { return '' }
    const hours = Math.floor(time / 100)
    const minutes = time % 100
    return `${hours}:${minutes.toString().padStart(2, '0')}`
}

export function getParallelEvents(eventItem: ScheduleEvent) {
    return eventItem.subtitle?.split(',')?.map(x => x.trim()) ?? []
}
