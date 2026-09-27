#!/usr/bin/env node
import http from 'http'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = Number(process.env.BACKUP_SERVER_PORT || 3001)
const ALLOWED_HOSTS = ['127.0.0.1', 'localhost']

const runBackup = (schedule = 'daily') => {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['tools/backup_run.mjs'], {
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        BACKUP_SCHEDULE: schedule,
      },
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
        resolve({ ok: true, stdout, stderr, schedule })
      } else {
        reject(new Error(stderr || stdout || `Backup failed with exit code ${code}`))
      }
    })

    child.on('error', (error) => {
      reject(error)
    })
  })
}

const server = http.createServer(async (req, res) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'OPTIONS, POST, GET',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders)
    res.end()
    return
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  const schedule = url.searchParams.get('schedule') === 'weekly' ? 'weekly' : url.searchParams.get('schedule') === 'manual' ? 'manual' : 'daily'

  const host = req.headers.host || ''
  const hostname = host.split(':')[0]

  if (url.pathname !== '/api/backup') {
    res.writeHead(404, { 'Content-Type': 'application/json', ...corsHeaders })
    res.end(JSON.stringify({ ok: false, message: 'Not found' }))
    return
  }

  if (hostname && !ALLOWED_HOSTS.includes(hostname) && hostname !== 'localhost') {
    res.writeHead(403, { 'Content-Type': 'application/json', ...corsHeaders })
    res.end(JSON.stringify({ ok: false, message: 'Forbidden host' }))
    return
  }

  try {
    const result = await runBackup(schedule)
    res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders })
    res.end(JSON.stringify({
      ok: true,
      message: `${schedule === 'weekly' ? 'Weekly' : schedule === 'manual' ? 'Manual' : 'Daily'} backup completed successfully`,
      schedule,
      stdout: result.stdout,
    }))
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json', ...corsHeaders })
    res.end(JSON.stringify({
      ok: false,
      message: error instanceof Error ? error.message : 'Backup failed',
    }))
  }
})

server.listen(PORT, () => {
  console.log(`Backup server listening on http://localhost:${PORT}`)
})
