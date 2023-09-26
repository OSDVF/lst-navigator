export default function onlyBuildTasks() {
    return (process.argv.includes('dev') || process.argv.includes('generate'))
}
