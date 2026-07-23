# form-connector

To install dependencies:

```bash
bun install
```

To build:

```bash
bun run build
```

To publish to Google Apps Script project:

```bash
bun push
```

## Setup
These [Script Properties](https://stackoverflow.com/a/72008088) must be set
```
apiKey
projectId
appId
```

> TODO: Main app should set the properties automatically

This project was created using `bun init` in bun v1.3.9. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

## Emulator
`gas-fakes` is used to create alternative runtime for the Apps Script project. It emulates the execution environment, but the accessed data (on Google Drive, etc.) are real.

Install Google Cloud CLI https://cloud.google.com/sdk/gcloud or from your distro repo (e.g. AUR `pamac install google-cloud-cli-lite`)
```bash
./node_modules/.bin/gas-fakes init # set required project information
./node_modules/.bin/gas-fakes auth # authenticate for using your Google Workspace project
# at the end the script will print information you must enter into https://admin.google.com/ac/owl/domainwidedelegation
```

Add required environment variables into .env
```bash
# example
REGISTRATION_FORM_API="http://localhost:4242"
REGISTRATION_FORM_EXECUTIVE="registration@localhost"
```

Run wild
```bash
bun --watch emulator.ts 
```
