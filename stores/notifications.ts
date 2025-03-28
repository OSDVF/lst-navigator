import { defineStore } from 'pinia'

export const useNotifications = defineStore('notifications', () => {
    const permission = Notification.requestPermission()

    /* function scheduleNotifications() {
        permission.then((permission) => {
            if (permission === 'granted') {
                alert('you need to allow push notifications')
            } else {
                const timestamp = new Date().getTime() + 5 * 1000 // now plus 5000ms
                reg.showNotification(
                    'Demo Push Notification',
                    {
                        tag: timestamp, // a unique ID
                        body: 'Hello World', // content of the push notification
                        showTrigger: new TimestampTrigger(timestamp), // set the time for the push notification
                        data: {
                            url: window.location.href // pass the current url to the notification
                        },
                        badge: './assets/badge.png',
                        icon: './assets/icon.png'
                    }
                )
            }
        })
    } */

    return {
        permission,
    }
})
