import merge from 'lodash.merge'
import { useCloudStore } from '~/stores/cloud'
import type * as ExportToCsv from 'export-to-csv'
import type { FieldValue } from 'firebase/firestore'
import type { Feedback, FeedbackSections } from '~/types/cloud'

function sanitize(str: string | FieldValue) {
    if (typeof str === 'object') {
        return ''
    }
    return str.replace('"', '\'')
        .replace(',', '，')
}

let exportToCsv: null | typeof ExportToCsv = null
export async function csvExport(name: string, error: Ref<string|unknown>, sections: FeedbackSections, cloud?: ReturnType<typeof useCloudStore>) {
    const cloudStore = cloud?? useCloudStore()
    try {
        error.value = ''
        if (!exportToCsv) {
            exportToCsv = await import('export-to-csv')
        }

        const csvData = []
        const compoundIndexes: string[] = []
        const byUserData: { [user: string]: { [compoundId: string]: Feedback } } = {}
        for (const partIndex in sections) {
            const part = sections[partIndex]
            if (typeof part === 'number' || part === null) { continue }
            for (const eventIndex in part) {
                const event = part[eventIndex]
                for (const user in event) {
                    const feedback = event[user] as Feedback | null
                    if (feedback?.basic || feedback?.detail || feedback?.select || feedback?.complicated?.find(c => !!c)) {
                        if (!byUserData[user]) {
                            byUserData[user] = {}
                        }
                        let compoundIndex = `${partIndex}-${eventIndex}`
                        const potentialTitle = cloudStore.days[parseInt(partIndex)]?.program?.[parseInt(eventIndex)]?.title
                        if (potentialTitle) {
                            compoundIndex += `-${potentialTitle}`
                        }
                        byUserData[user][compoundIndex] = feedback
                        if (!compoundIndexes.includes(compoundIndex)) {
                            compoundIndexes.push(compoundIndex)
                        }
                        const potentialInner = `${eventIndex}-0`
                        if (compoundIndexes.includes(potentialInner)) {
                            byUserData[user][compoundIndex] = merge(byUserData[user][compoundIndex], byUserData[user][potentialInner])
                        }
                    }
                }
            }
        }

        const compoundIndexesExpanded: string[] = []
        for (const user in byUserData) {
            const userData: { [key: string]: boolean | string | number } = {}
            for (const compoundIndex of compoundIndexes) {
                const feedback = byUserData[user][compoundIndex]
                if (feedback) {
                    const basicCol = `${compoundIndex}-celkove`
                    userData[basicCol] = feedback.basic as number ?? ''
                    if (feedback.basic && !compoundIndexesExpanded.includes(basicCol)) {
                        compoundIndexesExpanded.push(basicCol)
                    }
                    const detailCol = `${compoundIndex}-detail`
                    userData[detailCol] = sanitize(feedback.detail as string ?? '')
                    if (feedback.detail && !compoundIndexesExpanded.includes(detailCol)) {
                        compoundIndexesExpanded.push(detailCol)
                    }
                    const selectCol = `${compoundIndex}-vyber`
                    userData[selectCol] = sanitize(feedback.select as string ?? '')
                    if (feedback.select && !compoundIndexesExpanded.includes(selectCol)) {
                        compoundIndexesExpanded.push(selectCol)
                    }
                    const complicatedCols = [
                        `${compoundIndex}-otazka1`,
                        `${compoundIndex}-otazka2`,
                        `${compoundIndex}-otazka3`,
                    ]
                    for (const col of complicatedCols) {
                        userData[col] = feedback.complicated?.[parseInt(col[col.length - 1]) - 1] as number ?? ''
                        if (feedback.complicated?.[parseInt(col[col.length - 1]) - 1] && !compoundIndexesExpanded.includes(col)) {
                            compoundIndexesExpanded.push(col)
                        }
                    }
                } else {
                    userData[`${compoundIndex}-celkove`] = ''
                    userData[`${compoundIndex}-detail`] = ''
                    userData[`${compoundIndex}-vyber`] = ''
                    userData[`${compoundIndex}-otazka1`] = ''
                    userData[`${compoundIndex}-otazka2`] = ''
                    userData[`${compoundIndex}-otazka3`] = ''
                }
            }

            csvData.push({ user, ...userData })
        }
        compoundIndexesExpanded.sort((a, b) => {
            const [day, program, _rest] = a.split('-', 3)
            const dayInt = parseInt(day)
            const programInt = parseInt(program)

            const [day2, program2, _rest2] = b.split('-', 3)
            const dayInt2 = parseInt(day2)
            const programInt2 = parseInt(program2)

            if(!isNaN(dayInt) && !isNaN(programInt)) {
                if(!isNaN(dayInt2) && !isNaN(programInt2)) {
                    if(dayInt === dayInt2) {
                        return programInt - programInt2
                    }
                    return dayInt - dayInt2
                }
            }
            return a.localeCompare(b)
        })
        const csvConfig = exportToCsv.mkConfig({
            filename: `${name}-feedback-${new Date().toLocaleString(navigator.language)}`,
            columnHeaders: ['user', ...compoundIndexesExpanded],
        })

        exportToCsv.download(csvConfig)(exportToCsv.generateCsv(csvConfig)(csvData))
    } catch (e) {
        error.value = e
    }
}