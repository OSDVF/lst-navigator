import { useScheduler } from '#scheduler'
import notify from '~~/server/app/services/notify'

export default defineNitroPlugin(() => {
    if (process.env.NOTIFICATIONS !== 'false' && !process.argv.includes('generate')) {
        startScheduler()
    }
})

function startScheduler() {
    console.log('Starting notification scheduler')
    const scheduler = useScheduler()

    scheduler.run(() => {
        notify()
    }).everyTwoMinutes()
}
