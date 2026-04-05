// scripts/import-mock-questions.js
// Imports Economy, Polity, Geography, SciTech, Environment mock questions into Supabase
const fs = require('fs')
const path = require('path')
const https = require('https')

// ── Config ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://wnbeuxmllrkczbbjcjyj.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InduYmV1eG1sbHJrY3piYmpjanlqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDUwNTIxNSwiZXhwIjoyMDkwMDgxMjE1fQ.yKJiOMW619jctk5TrMmBuvDfxhliHS7QEBJXMA19DMs'

const SUBJECT_IDS = {
  Polity:      '5f6c2cac-ddcf-42f6-8c5e-44ec37f7826d',
  History:     '82b6b4ba-b154-4e22-9899-6c45215dcb66',
  Geography:   'aa546b90-cb1f-46b0-82c5-32ba864a4b39',
  Economy:     '586ca2c0-b307-4d6d-8a81-db6c81f34343',
  Environment: 'c758ca30-e336-4715-924f-f6b6eb692aee',
  'Science & Tech': 'f4426a72-a8ff-4366-b61f-a8a3cad3c41c',
}

const FILES = [
  { path: '/Users/dhanush/Downloads/IndicorePolity&Economy - Economy.csv',    subject: 'Economy' },
  { path: '/Users/dhanush/Downloads/IndicorePolity&Economy - Polity.csv',     subject: 'Polity' },
  { path: '/Users/dhanush/Downloads/IndicoreGeography - Geography.csv',       subject: 'Geography' },
  { path: '/Users/dhanush/Downloads/IndicoreScieandTech - English.csv',       subject: 'Science & Tech' },
  { path: '/Users/dhanush/Downloads/IndiCoreEnvironment - Environment.csv',   subject: 'Environment' },
]

// ── Helpers ──────────────────────────────────────────────────────────────────
function supabaseInsert(rows) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(rows)
    const url = new URL(`${SUPABASE_URL}/rest/v1/questions`)
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'return=minimal',
      },
    }
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ ok: true })
        } else {
          resolve({ ok: false, status: res.statusCode, body: data })
        }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const rows = []
  let i = 0
  // skip header line
  while (i < content.length && content[i] !== '\n') i++
  i++

  while (i < content.length) {
    const row = []
    while (i < content.length) {
      if (content[i] === '"') {
        i++
        let field = ''
        while (i < content.length) {
          if (content[i] === '"' && content[i + 1] === '"') { field += '"'; i += 2 }
          else if (content[i] === '"') { i++; break }
          else { field += content[i]; i++ }
        }
        row.push(field)
      } else {
        let field = ''
        while (i < content.length && content[i] !== ',' && content[i] !== '\n') {
          if (content[i] === '\r') { i++; continue }
          field += content[i]; i++
        }
        row.push(field.trim())
      }
      if (i < content.length && content[i] === ',') { i++ }
      else { if (i < content.length && content[i] === '\r') i++; if (i < content.length && content[i] === '\n') i++; break }
    }
    if (row.length >= 4) rows.push(row)
  }
  return rows
}

function parseOptions(cell) {
  if (!cell) return null
  const result = { a: '', b: '', c: '', d: '' }
  let currentKey = null
  for (const line of cell.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const match = trimmed.match(/^\(?([abcdABCD])\)?[.)]\s*(.+)/)
    if (match) {
      currentKey = match[1].toLowerCase()
      result[currentKey] = match[2].trim()
    } else if (currentKey) {
      result[currentKey] += ' ' + trimmed
    }
  }
  // trim all values
  for (const k of ['a', 'b', 'c', 'd']) result[k] = result[k].trim()
  if (result.a && result.b && result.c && result.d) return result
  return null
}

function normalizeDifficulty(raw) {
  const v = (raw || '').toUpperCase().trim()
  if (v === 'HARD') return 'hard'
  if (v === 'EASY') return 'easy'
  return 'medium'
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function run() {
  console.log('\n🚀 Indicore Mock Question Import\n')
  let grandTotal = 0
  let grandFailed = 0

  for (const file of FILES) {
    const subjectId = SUBJECT_IDS[file.subject]
    if (!subjectId) { console.error(`❌ No subject_id for ${file.subject}`); continue }

    console.log(`\n📂 ${file.subject} — ${path.basename(file.path)}`)
    const rows = parseCSV(file.path)
    console.log(`   ${rows.length} rows parsed`)

    const toInsert = []
    let skipped = 0

    for (const row of rows) {
      const questionText = (row[1] || '').trim()
      const optionsCell  = (row[2] || '').trim()
      const answerRaw    = (row[3] || '').trim()
      const explanation  = (row[4] || '').trim()
      const difficultyRaw = (row[5] || '').trim()
      const subtopic     = (row[6] || '').trim()

      if (!questionText || questionText.length < 5) { skipped++; continue }

      // Answer: expect single letter A/B/C/D possibly with trailing text
      const answerMatch = answerRaw.match(/^([ABCD])/i)
      const correctOption = answerMatch ? answerMatch[1].toUpperCase() : null
      if (!correctOption) { skipped++; continue }

      const options = parseOptions(optionsCell)
      if (!options) { skipped++; continue }

      toInsert.push({
        subject_id: subjectId,
        exam_type: 'INDICORE_MOCK',
        year: 2025,
        paper: 'Prelims GS1',
        paper_label: `${file.subject} Mock`,
        question_text: questionText,
        option_a: options.a,
        option_b: options.b,
        option_c: options.c,
        option_d: options.d,
        correct_option: correctOption,
        explanation: explanation || null,
        difficulty: normalizeDifficulty(difficultyRaw),
        subtopic: subtopic || null,
        tags: subtopic ? [subtopic] : [],
        is_active: true,
        expected_time_seconds: 72,
      })
    }

    if (skipped > 0) console.log(`   ⚠️  ${skipped} rows skipped (missing question/options/answer)`)
    console.log(`   📝 ${toInsert.length} questions ready to insert`)

    // Batch insert (50 per request)
    const BATCH = 50
    let success = 0
    let failed = 0

    for (let i = 0; i < toInsert.length; i += BATCH) {
      const batch = toInsert.slice(i, i + BATCH)
      const result = await supabaseInsert(batch)
      if (result.ok) {
        success += batch.length
        process.stdout.write(`\r   ✅ Inserted ${success}/${toInsert.length}...`)
      } else {
        console.error(`\n   ❌ Batch error (rows ${i}–${i + batch.length}): ${result.status} ${result.body}`)
        failed += batch.length
      }
      await new Promise(r => setTimeout(r, 80))
    }

    console.log(`\n   ✅ Done: ${success} inserted, ${failed} failed`)
    grandTotal += success
    grandFailed += failed
  }

  console.log(`\n${'─'.repeat(50)}`)
  console.log(`🏁 Import complete!`)
  console.log(`   ✅ Total inserted: ${grandTotal}`)
  if (grandFailed > 0) console.log(`   ❌ Total failed:   ${grandFailed}`)
  console.log()
}

run().catch(err => { console.error('Fatal:', err); process.exit(1) })
