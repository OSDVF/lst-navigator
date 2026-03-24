import { getEventSettings } from './settings'

export function sidebar() {
    const ui = FormApp.getUi()
    const sidebar = HtmlService.createTemplateFromFile('Sidebar')
    const customQR = HtmlService.createTemplateFromFile('CustomQR')
    const settings = getEventSettings(FormApp.getActiveForm())

    Object.assign(sidebar, settings)
    Object.assign(customQR, settings)
    ui.showSidebar(sidebar.evaluate().setTitle('Přihláška')
        .append(`<hr><details><summary>Vlastní QR kód</summary>${customQR.evaluate().getContent()}</details>`)
        .append(HtmlService.createHtmlOutputFromFile('Style').getContent()),
    )
}