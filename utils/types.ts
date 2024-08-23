import type { Feedback, FeedbackType, ScheduleEvent } from '@/types/cloud'

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
export function toHumanFeedback(feedback?: FeedbackType) {
    if (!feedback) { return undefined }
    return {
        'basic': '⭐⭐⭐⭐⭐',
        'complicated': 'Několik ⭐⭐⭐⭐⭐',
        'text': 'Textová otázka',
        'parallel': 'Paralelní programy',
        'select': 'Výběr z možností',
    }[feedback]
}

export function toJSDate(date: undefined): null;
export function toJSDate(date: string): Date;
export function toJSDate(date?: string) {
    if (!date) { return null }
    const [year, month, day] = date.split('-').map(x => parseInt(x))
    return new Date(year, month - 1, day)
}

export function toFirebaseDate(data?: Date) {
    if (!data) { return null }
    return `${data.getFullYear()}-${toFirebaseMonthDay(data)}`
}

export function toFirebaseMonthDay(date: Date) {
    return `${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
}

export function getParallelEvents(eventItem: ScheduleEvent) {
    return eventItem.subtitle?.split(',')?.map(x => x.trim()) ?? []
}

export function onlyIntIndexed<T>(a: { [key: string | number | symbol]: T } | ArrayLike<T>) {
    const result = []
    for (const key in a) {
        if (!isNaN(parseInt(key))) {
            result[parseInt(key)] = a[key]
        }
    }
    return result
}

export function getAverage(replies: { [key: string]: Feedback }) {
    const compl: { [index: string | number]: number } = {}
    const complCount: { [index: string | number]: number } = {}
    let basic = 0
    let basicCount = 0
    for (const rI in replies) {
        const r = replies[rI]
        if (r.basic) {
            basic += r.basic as number
            basicCount++
        }
        if (r.complicated) {
            for (const c in r.complicated) {
                if (r.complicated?.[c] !== null) {
                    if (!compl[c]) {
                        compl[c] = 0
                        complCount[c] = 0
                    }
                    compl[c] += r.complicated[c]!
                    complCount[c]++
                }
            }
        }
    }

    return {
        basic: basic / basicCount,
        complicated: Object.keys(compl).map(i => compl[i] / complCount[i]),
    }
}

export function hasFeedback(f: Feedback | { [key: string]: Feedback } | Feedback): boolean {
    const v = Object.values(f)
    return f.basic || f.complicated || f.detail || f.select || (v && v.find(fs => hasFeedback(fs)))
}

export async function timeoutPromise<T>(prom: Promise<T>, time = 5000): Promise<T> {
    let timer: NodeJS.Timeout | null = null
    try {
        return await Promise.race([
            prom,
            new Promise<T>((_resolve, reject) => { timer = setTimeout(reject, time) }),
        ])
    } finally {
        if (timer) { clearTimeout(timer) }
    }
}

function objectMap(obj: object, fn: (v: any, k: string, i: number) => any): { [key: string]: any } {
    return Object.fromEntries(
        Object.entries(obj).map(
            ([k, v], i) => [k, fn(v, k, i)],
        ),
    )
}

export function mapObject<T, U>(obj: { [key: string]: T }, fn: (v: T, k: string, i: number) => U): { [key: string]: U } {
    return objectMap(obj, fn)
}

export function parseIntOrNull(value?: string) {
    if (typeof value === 'undefined') { return undefined }
    const parsed = parseInt(value)
    return isNaN(parsed) ? null : parsed
}