export function findTriggers(form: GoogleAppsScript.Forms.Form) {
    let foundSidebar: GoogleAppsScript.Script.Trigger | null = null
    let foundSend: GoogleAppsScript.Script.Trigger | null = null
    const triggers = ScriptApp.getUserTriggers(form)
    for (const trigger of triggers) {
        const fn = trigger.getHandlerFunction()
        switch (fn) {
        case 'sidebar':
            foundSidebar = trigger
            break
        case 'onSubmitForm':
            foundSend = trigger
            break
        }
    }
    return {
        foundSend,
        foundSidebar,
    }
}

export function registerSubmitTrigger(form: GoogleAppsScript.Forms.Form) {
    return ScriptApp.newTrigger('onSubmitForm').forForm(form).onFormSubmit().create()
}
export function registerSidebarTrigger(form: GoogleAppsScript.Forms.Form) {
    return ScriptApp.newTrigger('sidebar').forForm(form).onOpen().create()
}

export function registerAllTriggers() {
    const form = FormApp.getActiveForm()
    let {
        foundSend,
        foundSidebar,
    } = findTriggers(form)
    if (!foundSidebar) { foundSidebar = registerSidebarTrigger(form) }
    if (!foundSend) { foundSend = registerSubmitTrigger(form) }

    return { foundSend, foundSidebar }
}

export function areTriggersRegistered() {
    const form = FormApp.getActiveForm()
    const tr = findTriggers(form)
    return (tr.foundSend && tr.foundSidebar) ? Session.getEffectiveUser()?.getEmail() : false
}