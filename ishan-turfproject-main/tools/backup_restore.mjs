#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DEFAULT_TABLES = [
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
  'users',
]

function parseTables(raw) {
  if (!raw) return DEFAULT_TABLES
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

function getFilePath(target, backupType = 'latest') {
  const baseDir = backupType === 'latest'
    ? path.join(__dirname, 'backups')
    : path.join(__dirname, 'backups', backupType)

  if (!target || target === 'latest') {
    const files = fs.existsSync(baseDir)
      ? fs.readdirSync(baseDir).filter((name) => name.endsWith('.json.gz')).sort().reverse()
      : []

    if (!files.length) {
      throw new Error(`No local backup files found in ${baseDir}. Run the backup job first or pass a specific file path.`)
    }

    return path.join(baseDir, files[0])
  }

  return target
}

async function getLatestRemoteBackup(supabase, bucket, backupType = 'manual') {
  const storageFolder = backupType === 'weekly' ? 'weekly' : backupType === 'daily' ? 'daily' : 'manual'
  const { data, error } = await supabase.storage.from(bucket).list(storageFolder)
  if (error) throw error
  const files = (data || [])
    .filter((item) => item.name && item.name.endsWith('.json.gz'))
    .sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime())

  if (!files.length) {
    throw new Error('No backup files found in Supabase storage bucket.')
  }

  const filename = `${storageFolder}/${files[0].name}`
  const { data: blob, error: downloadError } = await supabase.storage.from(bucket).download(filename)
  if (downloadError) throw downloadError

  const fileBuffer = Buffer.from(await blob.arrayBuffer())
  const outputPath = path.join(__dirname, 'backups', storageFolder, files[0].name)
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, fileBuffer)

  return outputPath
}

async function restoreTable(supabase, tableName, rows) {
  if (!Array.isArray(rows) || rows.length === 0) return

  const hasId = rows.some((row) => row && typeof row === 'object' && 'id' in row)
  if (hasId) {
    const { error } = await supabase.from(tableName).upsert(rows, { onConflict: 'id' })
    if (error) throw error
    return
  }

  const { error } = await supabase.from(tableName).insert(rows)
  if (error) throw error
}

async function main() {
  const target = process.argv[2] || 'latest'
  const backupTypeArg = process.argv[3] || 'manual'
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_PROJECT_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE
  const bucket = process.env.SUPABASE_BACKUP_BUCKET || 'backups'
  const tables = parseTables(process.env.SUPABASE_BACKUP_TABLES)
  const backupType = (backupTypeArg || 'manual').toLowerCase()

  if (!url || !key) {
    console.error('Missing Supabase env vars. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before restoring a backup.')
    process.exit(2)
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false },
  })

  let backupPath = null
  if (target === 'latest' || (!path.isAbsolute(target) && !target.includes('/') && !target.includes('\\'))) {
    try {
      backupPath = await getLatestRemoteBackup(supabase, bucket, backupType)
    } catch (remoteError) {
      console.warn('No remote backup found, falling back to local backup directory:', remoteError.message)
      backupPath = getFilePath(target, backupType)
    }
  } else {
    backupPath = getFilePath(target, backupType)
  }

  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file not found: ${backupPath}`)
  }

  const compressed = fs.readFileSync(backupPath)
  const parsed = zlib.gunzipSync(compressed).toString('utf8')
  const backup = JSON.parse(parsed)
  const payload = backup?.data || {}

  console.log('Restoring backup from:', backupPath)
  for (const tableName of tables) {
    if (!payload[tableName] || payload[tableName].error) {
      console.warn(`Skipping table ${tableName}: no rows in backup or fetch error recorded.`)
      continue
    }

    const rows = Array.isArray(payload[tableName]) ? payload[tableName] : [payload[tableName]]
    console.log(`Restoring ${rows.length} rows into ${tableName}`)
    await restoreTable(supabase, tableName, rows)
  }

  console.log('Restore complete.')
}

main().catch((error) => {
  console.error('Restore failed:', error.message || error)
  process.exit(1)
})
