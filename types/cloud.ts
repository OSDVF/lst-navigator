import type { FieldValue } from 'firebase/firestore'

export type FeedbackType = 'basic' | 'complicated' | 'parallel' | 'select' | 'text'
export type FeedbackConfig = {
    group?: string | RegExp, // title of parts of schedule to group by
    title: string,
    individual: {
        name: string,
        questions: string[]
        type?: FeedbackType,
        description?: string
    }[],
}
export type ScheduleEvent = {
    color?: string
    notify?: string[]
    subtitle?: string
    title?: string
    time?: number
    feedbackType?: FeedbackType,
    detailQuestion?: string,
    description?: string,
    questions?: string[],
    icon?: string // iconify code
}

export type SchedulePart = {
    date: string,
    name: string,
    program: ScheduleEvent[]
};

export type EventSubdocuments = 'meta' | 'notes' | 'feedback' | 'subscriptions' | 'users'
export const EventSubdocumentsList: EventSubdocuments[] = ['meta', 'notes', 'feedback', 'subscriptions', 'users']

export type EventMeta = {
    description: string,
    title: string,
    subtitle: string,
    schedule: {
        parts: SchedulePart[]
    }, // in the database this a reference to another document, but this reference is being resolved by vuefire
    image: string, // url
    feedback: FeedbackConfig[],
    feedbackInfo: string,
    groups: string[],
    web: string
}

export type EventDescription<T = string> = {
    title: string,
    start: string, // in format 2023-01-30
    end: string,
    meta: EventMeta
} & {
        [key in EventSubdocuments]: T
    }

export type Permissions = {
    superAdmin: boolean,
    /**
     * Also has access to the administrator section and can edit feedback results
     */
    editEvent: boolean,
    /**
     * Can edit schedule on this event and has access to feedback results
     */
    editSchedule: boolean,
}

export enum UserLevel {
    Nothing,
    ScheduleAdmin,
    Admin,
    SuperAdmin
}

export type UserInfo = {
    permissions: { [key: 'superAdmin' | string]: boolean | UserLevel }
    subscriptions: {
        [eventId: string]: string
    },
    signature: {
        [eventId: string]: string
    },
    signatureId: {
        [eventId: string]: string
    },
    name?: string,
    email?: string,
    photoURL?: string,
    lastLogin: number,
    lastTimezone: number
}

export type UpdatePayload<T> = {
    [key in keyof T]: T[key] | UpdatePayload<T[key]> | FieldValue
}

export type Feedback = {
    basic?: number | FieldValue,
    detail?: string | FieldValue,
    complicated?: (number | null)[],
    select?: string | FieldValue
}

export type TabulatedFeedback = {
    replies: { [key: string | number]: (Feedback | null)[] },
    respondents: string[]
}

export type Subscriptions = {
    [webPushToken: string]: /* array of notification groups */string[] | true /* subscribe to all groups */
}
