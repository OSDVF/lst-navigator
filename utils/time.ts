import type { FeedbackType } from '~/types/cloud'

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
        basic: '⭐⭐⭐⭐⭐',
        complicated: 'Několik ⭐⭐⭐⭐⭐',
        text: 'Textová otázka',
        parallel: 'Paralelní programy',
        multiple: 'Zaškrtávací políčka',
        select: 'Výběr z možností',
    }[feedback]
}
export function dayName(date: Date, locales: Intl.LocalesArgument) {
    return toTitleCase(date.toLocaleDateString(locales, { weekday: 'long', month: 'numeric', day: 'numeric' }).replace('. ', '. '))
}

export function getBrowserDateFormat() {
    return new Intl.DateTimeFormat((new Intl.NumberFormat()).resolvedOptions().locale).formatToParts(new Date()).map(obj => {
        switch (obj.type) {
        case 'day':
            return 'DD'
        case 'month':
            return 'MM'
        case 'year':
            return 'YYYY'
        default:
            return obj.value
        }
    }).join('')
}

export const oneDay = 1000 * 3600 * 24
