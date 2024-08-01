export default function onlyBuildTasks() {
    // Do not run additional tasks when developing, but always run them in CI scripts
    return (process.argv.includes('dev') || process.argv.includes('generate')) && !process.argv.includes('ci')
}
