import { exec } from 'child_process'
import ghpages from 'gh-pages'

function run (command: string): Promise<{ stdout: string, stderr: string }> {
  return new Promise((resolve, reject) => {
    exec(command, (err, stdout, stderr) => {
      if (err) {
        reject(err)
      } else {
        resolve({ stdout, stderr })
      }
    })
  })
}

function publish (basePath: string, options: ghpages.PublishOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    ghpages.publish(basePath, options, err => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}

async function main () {
  const { stdout: lastCommit } = await run('git log --pretty=format:%H -n1')
  const { stdout: headRef } = await run('git symbolic-ref -q HEAD')
  const branchName = headRef.replace('refs/heads/', '').trim()

  await publish('dist/', {
    dest: branchName === 'main' ? '.' : branchName,
    add: branchName === 'main',
    message: `Deploy ${lastCommit} to GitHub Pages using gh-pages.`,
  })
}

main()
  .catch(err => {
    console.error(err)
    process.exitCode = 1
  })
