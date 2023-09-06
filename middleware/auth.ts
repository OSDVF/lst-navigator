import { useCloudStore } from '@/stores/cloud'

// middleware/auth.ts
export default defineNuxtRouteMiddleware((to) => {
    const cloudStore = useCloudStore()

    // redirect the user to the login page
    if (!cloudStore.user.auth?.uid) {
        return navigateTo({
            path: '/login',
            query: {
                redirect: to.fullPath
            }
        })
    }
})
