import fs from 'fs'
import childProcess from 'child_process'

export const installStepCount = fs.readdirSync(__dirname + '/../pages/install').length
export const commitMessageTime = childProcess.execSync('git log -1 --pretty="%B %cI"').toString().trim()
export const commitHash = childProcess.execSync('git rev-parse --short HEAD').toString().trim()
export const compileTime = new Date().getTime().toString()
export const compileTimeZone = new Date().getTimezoneOffset().toString()