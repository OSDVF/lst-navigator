import { useScheduler } from '#scheduler'
import notify from '~~/server/app/services/notify'

export default defineNitroPlugin(() => {
    if (process.env.NOTIFICATIONS !== 'false') {
        startScheduler()
    }
})

function startScheduler() {
    const scheduler = useScheduler()

    scheduler.run(() => {
        notify()
    }).everyTwoMinutes()
}
