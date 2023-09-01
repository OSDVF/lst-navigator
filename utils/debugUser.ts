import { User } from 'firebase/auth'

export default {
    uid: 'debug',
    emailVerified: true,
    metadata: {},
    displayName: 'debug',
    email: 'debug@email.com',
    phoneNumber: null,
    photoURL: null,
    providerId: 'debug',
    providerData: [],
    isAnonymous: false,
    refreshToken: '',
    tenantId: null,
    delete() { return Promise.resolve() },
    getIdToken(_) { return Promise.resolve(this.uid) },
    getIdTokenResult(_) { return Promise.resolve() as any },
    async reload() {
    },
    async toJSON() {
    }
} as User
