import type { Api, ButtonConfig } from 'datatables.net-dt'
import type { ApplicationState } from '~/form-connector/src/responses'

export function renderBool(data: boolean) {
    return data ? '✔' : ''
}

export function renderPhone(number: string) {
    return `${number} <a class="only-hover-visible" href="tel:${number}">${useIconEl('phone')}</a>`
}

export function renderState(data: ApplicationState) {
    return ApplicationStateUI[data].name
}
export function renderSent(data: boolean) {
    return data ? '✔' : '<span class=\'muted\' title=\'Neodeslán\'>❌</span>'
}

export function renderUndefined(data?: string) {
    return data || ''
}
/**
 * Random hash function for creating identifiers for individual checkbox question responses
 */
export function simpleHash(s: string) {
    let hash = 0
    for (let i = 0; i < s.length; i++) {
        hash = (hash << 5) - hash + s.charCodeAt(i)
        hash |= 0
    }
    return hash
}


const checkedIcon = 'checkbox-marked-outline'
const uncheckedIcon = 'checkbox-blank-outline'
//DataTables has no checkbox button, so each toggle is a custom button whose icon reflects the current (un)checked state.
export function toggleCheckbox<T>(config: ButtonConfig, checked: boolean) {
    return {
        text: checked
            ? (useIconEl(checkedIcon) + '&nbsp;' + config.text)
            : (useIconEl(uncheckedIcon) + '&nbsp;' + config.text),
        action: (e: JQuery.Event,
            dt: Api<T>,
            node: JQuery,
            config2: ButtonConfig, callback: VoidFunction) => {

            const icon = node.find('.icon')
            const style = icon.attr('style') ?? ''
            icon.attr('style', style.replace(checked ? checkedIcon : uncheckedIcon, checked ? uncheckedIcon : checkedIcon))
            config.action?.(e, dt, node, config2, callback as any)
        },
    }
}
