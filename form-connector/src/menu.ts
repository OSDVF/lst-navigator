import type { EventSettings } from './settings'

type MenuItem = {
    name: string,
    function?: string | (() => void),
    description?: string,
}

const settingsMenuFields: Partial<Record<keyof EventSettings, MenuItem>> = {
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
        function: function setTreatAllAsNew() {
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
        },
    },
    mainOrg: {
        name: '🧑‍✈️ Hlavní organizátor',
        description: 'V emailu účastníkům bude zobrazeno "kontaktuj hlavního organizátora – XXXXX".',
    },

}

const menuFields: Record<string, MenuItem> = {
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
    const menu = (ui.createMenu ? ui.createMenu('Nastavení přihlášky') : ui.createAddonMenu())

    for (const setting in settingsMenuFields) {
        const s = settingsMenuFields[setting as keyof typeof settingsMenuFields]!
        switch (typeof s.function) {
        case 'function':
            (globalThis as any)[s.function.name] = s.function
            break
        case 'string':
            break
        default:
            (globalThis as any)[`set${setting}`] = function () {
                const ui = FormApp.getUi()
                const docProps = PropertiesService.getDocumentProperties()

                const result = ui.prompt(s.name, `Současné nastavení: ${docProps.getProperty(setting) || ''}\n${s.description}`, ui.ButtonSet.OK_CANCEL)
                if (result.getSelectedButton() == ui.Button.OK) {
                    docProps.setProperty(setting, result.getResponseText())
                }
            }
        }
        menu.addItem(s.name, typeof s.function == 'function' ? s.function.name : typeof s.function == 'string' ? s.function : `set${setting}`)
    }

    menu.addSeparator()

    for (const field in menuFields) {
        const f = menuFields[field]!

        if (typeof f.function == 'function') {
            (globalThis as any)[f.function.name] = f.function
        }
        menu.addItem(f.name, typeof f.function == 'function' ? f.function.name : typeof f.function == 'string' ? f.function : field)
    }
    menu.addToUi()
}