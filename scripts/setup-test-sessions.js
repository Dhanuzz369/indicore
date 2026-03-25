/**
 * setup-test-sessions.js
 * ---------------------------------------------------------------
 * Creates the test_sessions collection in Appwrite with all required
 * attributes and indexes.
 * Also adds the session_id attribute to quiz_attempts.
 *
 * Run with:  node scripts/setup-test-sessions.js
 */

const { Client, Databases } = require('node-appwrite')
require('dotenv').config({ path: '.env.local' })

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY)

const db = new Databases(client)

const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID
const ATTEMPTS_COL = process.env.NEXT_PUBLIC_COLLECTION_ATTEMPTS   // quiz_attempts
const TS_COL = 'test_sessions'   // new collection ID

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function safe(label, fn) {
  try {
    const result = await fn()
    console.log(`  ✅  ${label}`)
    return result
  } catch (e) {
    if (e.code === 409 || (e.message && e.message.toLowerCase().includes('already exist'))) {
      console.log(`  ⏭   ${label} — already exists, skipping`)
    } else {
      console.error(`  ❌  ${label} — ${e.message}`)
    }
  }
}

;(async () => {
  console.log('\n🚀  Starting Appwrite setup for test_sessions...\n')

  // ──────────────────────────────────────────────────
  // STEP 1: Create test_sessions collection
  // ──────────────────────────────────────────────────
  console.log('📦  Creating test_sessions collection...')
  await safe('Create collection: test_sessions', () =>
    db.createCollection(DB_ID, TS_COL, 'test_sessions')
  )
  await sleep(800)

  // ──────────────────────────────────────────────────
  // STEP 2: Add string attributes
  // ──────────────────────────────────────────────────
  console.log('\n📝  Adding string attributes...')

  const stringAttrs = [
    ['user_id',      255,   true],
    ['exam_type',    50,    true],
    ['paper',        150,   true],
    ['paper_label',  255,   true],
    ['mode',         50,    true],
    ['started_at',   50,    true],
    ['submitted_at', 50,    true],
    ['analytics',    65535, true],
    ['ai_feedback',  10000, false],
  ]

  for (const [key, size, required] of stringAttrs) {
    await safe(`String attr: ${key}`, () =>
      db.createStringAttribute(DB_ID, TS_COL, key, size, required)
    )
    await sleep(400)
  }

  // ──────────────────────────────────────────────────
  // STEP 3: Add integer attributes
  // ──────────────────────────────────────────────────
  console.log('\n🔢  Adding integer attributes...')

  const intAttrs = [
    ['year',                true],
    ['total_time_seconds',  true],
    ['total_questions',     true],
    ['attempted',           true],
    ['correct',             true],
    ['incorrect',           true],
    ['skipped',             true],
  ]

  for (const [key, required] of intAttrs) {
    await safe(`Integer attr: ${key}`, () =>
      db.createIntegerAttribute(DB_ID, TS_COL, key, required)
    )
    await sleep(400)
  }

  // ──────────────────────────────────────────────────
  // STEP 4: Add float attribute for score
  // ──────────────────────────────────────────────────
  console.log('\n📊  Adding float attribute: score...')
  await safe('Float attr: score', () =>
    db.createFloatAttribute(DB_ID, TS_COL, 'score', true)
  )
  await sleep(600)

  // ──────────────────────────────────────────────────
  // STEP 5: Create indexes
  // ──────────────────────────────────────────────────
  console.log('\n🗂   Creating indexes on test_sessions...')

  await safe('Index: user_id', () =>
    db.createIndex(DB_ID, TS_COL, 'idx_user_id', 'key', ['user_id'])
  )
  await sleep(500)

  await safe('Index: submitted_at', () =>
    db.createIndex(DB_ID, TS_COL, 'idx_submitted_at', 'key', ['submitted_at'])
  )
  await sleep(500)

  await safe('Index: exam_type', () =>
    db.createIndex(DB_ID, TS_COL, 'idx_exam_type', 'key', ['exam_type'])
  )
  await sleep(500)

  await safe('Index: user_submitted (compound)', () =>
    db.createIndex(DB_ID, TS_COL, 'idx_user_submitted', 'key', ['user_id', 'submitted_at'])
  )
  await sleep(500)

  // ──────────────────────────────────────────────────
  // STEP 6: Add session_id to quiz_attempts
  // ──────────────────────────────────────────────────
  console.log('\n🔗  Adding session_id to quiz_attempts...')
  await safe('String attr: session_id (quiz_attempts)', () =>
    db.createStringAttribute(DB_ID, ATTEMPTS_COL, 'session_id', 255, false)
  )
  await sleep(500)

  await safe('Index: session_id (quiz_attempts)', () =>
    db.createIndex(DB_ID, ATTEMPTS_COL, 'idx_session_id', 'key', ['session_id'])
  )
  await sleep(500)

  console.log('\n🎉  Setup complete! test_sessions collection is ready.\n')
  console.log('📋  Summary:')
  console.log('   • Collection:    test_sessions')
  console.log('   • Attributes:    user_id, exam_type, year, paper, paper_label, mode,')
  console.log('                    started_at, submitted_at, total_time_seconds, total_questions,')
  console.log('                    attempted, correct, incorrect, skipped, score,')
  console.log('                    analytics, ai_feedback')
  console.log('   • Indexes:       user_id, submitted_at, exam_type, user+submitted (compound)')
  console.log('   • quiz_attempts: +session_id (string, optional, indexed)')
  console.log('\n⚠️   IMPORTANT: Go to Appwrite Console → test_sessions → Settings → Permissions')
  console.log('   and add: Role = "users"  →  Create, Read, Update permissions\n')
})()
