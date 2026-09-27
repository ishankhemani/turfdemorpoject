#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function main() {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_PROJECT_URL
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  const BUCKET = process.env.SUPABASE_BACKUP_BUCKET || 'backups'
  const RETENTION_MONTHS = parseInt(process.env.SUPABASE_BACKUP_RETENTION_MONTHS || '12', 10)
  const BACKUP_TYPE = (process.env.BACKUP_SCHEDULE || process.env.BACKUP_TYPE || 'manual').toLowerCase()
  const BACKUP_FOLDER = BACKUP_TYPE === 'weekly' ? 'weekly' : BACKUP_TYPE === 'daily' ? 'daily' : 'manual'

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
    process.exit(2)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  const tables = [
    'bookings',
    'customers',
    'inventory_items',
    'inventory_sales',
    'expenses',
    'labour',
    'labour_payments',
    'liabilities',
    'liability_payments',
    'other_income',
    'marketing_campaigns',
    'users'
  ]

  console.log('Starting backup for tables:', tables.join(', '))

  const out = {
    meta: {
      created_at: new Date().toISOString(),
      source: SUPABASE_URL,
    },
    data: {},
  }

  for (const t of tables) {
    try {
      const { data, error } = await supabase.from(t).select('*')
      if (error) {
        console.warn('Warning fetching table', t, error.message || error)
        out.data[t] = { error: error.message || 'fetch-error' }
      } else {
        out.data[t] = data || []
        console.log(`Fetched ${out.data[t].length} rows from ${t}`)
      }
    } catch (e) {
      console.warn('Exception fetching table', t, e)
      out.data[t] = { error: String(e) }
    }
  }

  const filename = `${BACKUP_FOLDER}-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json.gz`
  const localDir = path.join(__dirname, 'backups', BACKUP_FOLDER)
  fs.mkdirSync(localDir, { recursive: true })
  const tmpPath = path.join(localDir, filename)
  const json = JSON.stringify(out)
  const gz = zlib.gzipSync(Buffer.from(json))
  fs.writeFileSync(tmpPath, gz)

  // Ensure bucket exists (create if missing)
  try {
    await supabase.storage.createBucket(BUCKET, { public: false })
  } catch (e) {
    // ignore if exists or unauthorized
  }

  // upload
  const filePath = `${BACKUP_FOLDER}/${filename}`
  const fileStream = fs.createReadStream(tmpPath)
  try {
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(filePath, fileStream, { upsert: false })
    if (upErr) throw upErr
    console.log('Uploaded backup to storage:', filePath)
  } catch (e) {
    console.error('Failed uploading backup to storage:', e.message || e)
    // fallback: write to local ./backups
    fs.mkdirSync(localDir, { recursive: true })
    fs.copyFileSync(tmpPath, path.join(localDir, filename))
    console.log('Saved backup to local folder:', path.join(localDir, filename))
  }

  // retention: delete older than RETENTION_MONTHS
  try {
    const { data: list, error: listErr } = await supabase.storage.from(BUCKET).list(BACKUP_FOLDER)
    if (!listErr && list) {
      const cutoff = Date.now() - RETENTION_MONTHS * 30 * 24 * 60 * 60 * 1000
      for (const item of list) {
        const created = new Date(item.updated_at || item.created_at || 0).getTime()
        if (created < cutoff) {
          await supabase.storage.from(BUCKET).remove([`${BACKUP_FOLDER}/${item.name}`])
          console.log('Deleted old backup:', `${BACKUP_FOLDER}/${item.name}`)
        }
      }
    }
  } catch (e) {
    console.warn('Retention cleanup failed', e)
  }

  // cleanup tmp
  try { fs.unlinkSync(tmpPath) } catch (e) {}

  console.log('Backup complete')
}

main().catch((e) => { console.error(e); process.exit(1) })
