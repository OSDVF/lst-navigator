import { ScheduleEvent } from '@/types/cloud'

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

export function toJSDate(date?: string) {
    if (!date) { return null }
    const [year, month, day] = date.split('-').map(x => parseInt(x))
    return new Date(year, month - 1, day)
}

export function getParallelEvents(eventItem: ScheduleEvent) {
    return eventItem.subtitle?.split(',')?.map(x => x.trim()) ?? []
}

export function onlyIntIndexed<T>(a: Array<T>) {
    const result = []
    for (const key in a) {
        if (!isNaN(parseInt(key))) {
            result[parseInt(key)] = (a[key])
        }
    }
    return result
}
