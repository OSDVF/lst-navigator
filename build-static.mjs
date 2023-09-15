import childProcess from 'child_process'
import { stderr, stdin, stdout, env } from 'process'
const p = childProcess.spawn('nuxt', ['generate'], { shell: true, env: { ...env, FORCE_COLOR: 'true' } })
/**
 * @param {Buffer} data
 */
p.stdout.on('data', (data) => {
    if (data.toString().includes('You can now deploy')) {
        p.kill()// Kill when complete
        // This is neccecary because the process will not exit on its own for some reason
    }
}).pipe(stdout)

p.stdin.pipe(stdin)
p.stderr.pipe(stderr)
