import fs from 'fs'
import childProcess from 'child_process'
import commitHash from './constants/commitHash'

export const installStepCount = fs.readdirSync(__dirname + '/../pages/install').length - 1
export const commitMessageTime = childProcess.execSync('git log -1 --pretty="%B %cI"').toString().trim()
export const compileTime = new Date().getTime().toString()
export { commitHash }
export const compileTimeZone = new Date().getTimezoneOffset().toString()