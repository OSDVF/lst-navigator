# LST Navigátor
## From Nuxt 3 Minimal Starter template
[![build](https://github.com/OSDVF/lst-navigator/actions/workflows/build.yml/badge.svg)](https://github.com/OSDVF/lst-navigator/actions/workflows/build.yml)

Použito pro akci [Moravskoslezské mládeže Českobratrské Církve Evangelické](https://msmladez.cz/)  
Used for [Moravian-Silesian Yout of Evangelical Church of Czech Brethren](https://msmladez.cz/) event

Look at the [Nuxt 3 documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

# Features
- Event schedule
- Generic or configurable feedback for each schedule item or custom form
- Basic user permission system
- Administration page for schedule and feedback
- Multiple

## Advanced technical features
- Maintenance tasks when starting development server
    - Checking database references (`modules/db-check.ts`)
    - Mirroring google account login page for precaching and CSR compliance (`modules/mirror-auth.ts`)
- SSR generating static schedule pages

## WIP
- Notifications
- Schedule and feedback management

## Setup

Make sure to install the dependencies:

```bash
npm i -g yarn
# yarn
yarn install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# yarn
yarn dev
```

## Production

Build the application for production:

```bash
# yarn
yarn build
```

Locally preview production build:

```bash
# yarn
yarn preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
