import { getCurrentUser } from 'vuefire'

// middleware/auth.ts
export default defineNuxtRouteMiddleware(async (to) => {
    const config = useRuntimeConfig()
    const user = config.public.debugUser ? debugUser : await getCurrentUser()

    // redirect the user to the login page
    if (!user) {
        return navigateTo({
            path: '/login',
            query: {
                redirect: to.fullPath
            }
        })
    }
})
