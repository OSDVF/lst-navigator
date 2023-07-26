// define environment variables here
declare namespace NodeJS {
    interface ProcessEnv {
        readonly APP_NAME: string;
        readonly APP_SHORT_NAME: string;
    }
}