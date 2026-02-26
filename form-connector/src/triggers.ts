export function findTriggers(form: GoogleAppsScript.Forms.Form) {
    let foundSidebar = false
    let foundSend = false
    const triggers = ScriptApp.getUserTriggers(form)
    for (const trigger of triggers) {
        const fn = trigger.getHandlerFunction()
        switch (fn) {
        case 'sidebar':
            foundSidebar = !!trigger
            break
        case 'onSubmitForm':
            foundSend = !!trigger
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

export function areTriggersRegistered() {
    const form = FormApp.getActiveForm()
    const tr = findTriggers(form)
    return (tr.foundSend && tr.foundSidebar) ? Session.getEffectiveUser()?.getEmail() : false
}