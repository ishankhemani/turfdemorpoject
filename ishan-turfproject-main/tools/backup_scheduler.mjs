#!/usr/bin/env node
import cron from 'node-cron'
import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const scheduleType = (process.argv[2] || 'daily').toLowerCase()

const runBackup = () => {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['tools/backup_run.mjs'], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, BACKUP_SCHEDULE: scheduleType },
      stdio: 'pipe',
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    child.on('close', (code) => {
      if (code === 0) {
        console.log(stdout.trim())
        resolve()
      } else {
        reject(new Error(stderr || stdout || `Backup failed with exit code ${code}`))
      }
    })

    child.on('error', (error) => {
      reject(error)
    })
  })
}

const cronExpression = scheduleType === 'weekly' ? '0 2 * * 0' : '0 2 * * *'

console.log(`Scheduling ${scheduleType} backup with cron: ${cronExpression}`)

cron.schedule(cronExpression, async () => {
  try {
    console.log(`Running ${scheduleType} backup...`)
    await runBackup()
    console.log(`${scheduleType} backup finished successfully.`)
  } catch (error) {
    console.error(`${scheduleType} backup failed:`, error instanceof Error ? error.message : error)
  }
})

if (process.env.NODE_ENV !== 'production') {
  console.log('Background scheduler started. Press Ctrl+C to stop.')
}
