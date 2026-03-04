import { getInternalSettings, type EventSettingsTemplated } from './settings'
import { sidebar } from './sidebar'
import { findTriggers, registerAllTriggers} from './triggers'

type MenuItem = {
    name: string,
    description?: string,
}

const settingsMenuFields: Partial<Record<keyof EventSettingsTemplated, MenuItem>> = {
    eventName: {
        name: 'Název akce',
        description: 'Vložte požadovaný email, na který mají chodit notifikace o odeslaných přihláškách nebo nechte prázdné místo pro vypnutí.',
    },
    adminEmail: {
        name: 'Email pro notifikace',
        description: 'Vložte požadovaný email, na který mají chodit notifikace o odeslaných přihláškách nebo nechte prázdné místo pro vypnutí.',
    },
    treatAllAsNew: {
        name: 'Odesílat email o změnách',
        description: 'Pokud účastník upraví přihlášku, má se mu poslat email, který říká, že přihláška byla upravena?',
    },
    mainOrg: {
        name: '🧑‍✈️ Hlavní organizátor',
        description: 'V emailu účastníkům bude zobrazeno "kontaktuj hlavního organizátora – XXXXX".',
    },
}

const menuFields: Record<string, MenuItem> = {
    connect: {
        name: '🈸 Propojit s aplikací',
    },
    sidebar: {
        name: '⚙️ Zobrazit panel',
    },
    triggersCheck: {
        name: '📧 Automatické odesílání',
    },
    generateQRCodeDialog: {
        name: '🏭 Vygenerovat vlastní QR kód',
    },
}


export function menu(ui: GoogleAppsScript.Base.Ui) {
    const connectMenu = (ui.createMenu ? ui.createMenu('🔌 Propojit s aplikací') : ui.createAddonMenu())
    const manualMenu = (ui.createMenu ? ui.createMenu('⚙️ Manuální nastavení') : connectMenu)

    connectMenu.addItem('🔌 Propojit s aplikací', '_connect')

    for (const setting in settingsMenuFields) {
        const s = settingsMenuFields[setting as keyof typeof settingsMenuFields]!
        manualMenu.addItem(s.name, `_${setting}`)
    }

    manualMenu.addSeparator()

    for (const field in menuFields) {
        const f = menuFields[field]!

        manualMenu.addItem(f.name, `_${field}`)
    }
    manualMenu.addToUi()
}

export function editSetting(id: keyof typeof settingsMenuFields) {
    const menuItem = settingsMenuFields[id]!
    const ui = FormApp.getUi()
    const docProps = PropertiesService.getDocumentProperties()

    const result = ui.prompt(menuItem.name, `Současné nastavení: ${docProps.getProperty(id) || ''}\n${menuItem.description}`, ui.ButtonSet.OK_CANCEL)
    if (result.getSelectedButton() == ui.Button.OK) {
        docProps.setProperty(id, result.getResponseText())
    }
}

export function _connect() {
    const ui = FormApp.getUi()
    const appSettings = getInternalSettings()

    const result = ui.prompt('🔌 Propojit s aplikací', (appSettings.apiKey && appSettings.remoteEventSettings) ? 'Již je propojeno.' : 'Zadejte kód vygenerovaný aplikací.', ui.ButtonSet.OK_CANCEL)
    if (result.getSelectedButton() == ui.Button.OK) {
        try {
            const response = JSON.parse(result.getResponseText())
            if (response.apiKey && response.remoteEventSettings) {
                for (const key in response) {
                    if (response[key]) {
                        PropertiesService.getDocumentProperties().setProperty(key, response[key])
                    }
                }
                ui.alert('Propojení bylo úspěšné!')
            } else {
                throw new Error('Neplatný kód, chybí některé z požadovaných polí.')
            }
        } catch (e) {
            ui.alert('Neplatný kód, zkontrolujte, zda jste zkopírovali celý kód a zkuste to znovu. (' + ((typeof e === 'object' && e && 'message' in e) ? e.message : 'neznámá chyba') + ')')
            return
        }
    }
}


export function _eventName() {
    editSetting('eventName')
}

export function _adminEmail() {
    editSetting('adminEmail')
}

export function _mainOrg() {
    editSetting('mainOrg')
}

export function _treatAllAsNew() {
    const ui = FormApp.getUi()
    const docProps = PropertiesService.getDocumentProperties()
    const treatAllAsNew = docProps.getProperty('treatAllAsNew') == 'true'

    const result = ui.prompt(
        'Odesílat email o změnách',
        `Současné nastavení: ${treatAllAsNew ? 'Ne' : 'Ano'}. Pokud účastník upraví přihlášku, má se mu poslat email, který říká, že přihláška byla upravena?`,
        ui.ButtonSet.YES_NO_CANCEL)
    const button = result.getSelectedButton()
    if (button != ui.Button.CANCEL) {
        docProps.setProperty('treatAllAsNew', button == ui.Button.YES ? 'true' : 'false')
    }
}

export function _triggersCheck() {
    const ui = FormApp.getUi()
    let t = findTriggers(FormApp.getActiveForm())

    if (t.foundSend && t.foundSidebar) {
        const response = ui.alert('Automatické odesílání již je instalováno. Chcete jej zrušit?', ui.ButtonSet.YES_NO)
        if (response == ui.Button.YES) {
            ScriptApp.deleteTrigger(t.foundSend)
        }
    } else {
        t = registerAllTriggers()
        ui.alert(t.foundSend ? 'Automatické odesílání bylo nainstalováno' : 'Vyskytla se chyba při instalaci')
    }
    if (!t.foundSidebar) {
        sidebar()
    }
}