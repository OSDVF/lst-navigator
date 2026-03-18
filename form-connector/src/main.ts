import { findTriggers, registerSubmitTrigger, registerSidebarTrigger } from './triggers'
import { sidebar } from './sidebar'
import { menu } from './menu'
export { doGet, doPost } from './api'
export { onSubmitForm } from './submit'
export { _connect, _adminEmail, _eventName, _mainOrg, _treatAllAsNew, _triggersCheck } from './menu'

export function onOpen(e: GoogleAppsScript.Events.FormsOnOpen) {
    const ui = FormApp.getUi()
    if (ui) {
        menu(ui)
        if (!e.user || e.authMode == ScriptApp.AuthMode.NONE) {
            return ui.alert('Tento formulář je přihláška. Pro nastavení klikněte na ikonu rozšíření 🧩')
        }
    }
}

export function onInstall() {
    const form = FormApp.getActiveForm()
    const {
        foundSend,
        foundSidebar,
    } = findTriggers(form)

    let ui = null
    try {
        ui = FormApp.getUi()
    } catch (e) {
        console.warn(e as object)
    }
    try {
        if (ui && !foundSend) {
            registerSubmitTrigger(form)
        }
        if (!foundSidebar) {
            registerSidebarTrigger(form)
        }
    } catch (e) {
        console.error(e as object)
    }

    if (ui) {
        menu(ui)
    }
    sidebar()
}

export function setTimeout(fn: CallableFunction) {
    return fn()
}