export { }

// define environment variables here
declare namespace NodeJS {
    interface ProcessEnv {
        readonly VITE_APP_NAME: string;
        readonly VITE_APP_SHORT_NAME: string;
    }
}