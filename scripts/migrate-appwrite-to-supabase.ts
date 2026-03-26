// scripts/migrate-appwrite-to-supabase.ts
import { Client, Databases, Query } from 'appwrite'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

// ── Appwrite client ───────────────────────────────────────────────────────────
const awClient = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
const awDbs = new Databases(awClient)
const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!
const SUBJECTS_COL = process.env.NEXT_PUBLIC_COLLECTION_SUBJECTS!
const QUESTIONS_COL = process.env.NEXT_PUBLIC_COLLECTION_QUESTIONS!

// ── Supabase client (service role bypasses RLS) ───────────────────────────────
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function fetchAllFromAppwrite(collectionId: string): Promise<any[]> {
  const all: any[] = []
  let offset = 0
  while (true) {
    const res = await awDbs.listDocuments(DB_ID, collectionId, [
      Query.limit(100),
      Query.offset(offset),
    ])
    all.push(...res.documents)
    console.log(`  fetched ${all.length}/${res.total}`)
    if (all.length >= res.total) break
    offset += 100
    await new Promise(r => setTimeout(r, 100)) // rate limit
  }
  return all
}

async function main() {
  console.log('=== Appwrite → Supabase Migration ===\n')

  // ── 1. Migrate subjects ────────────────────────────────────────────────────
  console.log('Step 1: Fetching subjects from Appwrite...')
  const subjects = await fetchAllFromAppwrite(SUBJECTS_COL)
  console.log(`Found ${subjects.length} subjects\n`)

  // Appwrite $id → new Supabase UUID
  const subjectIdMap = new Map<string, string>()

  for (const sub of subjects) {
    const { data, error } = await sb
      .from('subjects')
      .insert({
        name: sub.Name || sub.name,
        slug: sub.slug || null,
        icon: sub.icon || null,
        color: sub.color || null,
      })
      .select('id')
      .single()

    if (error) {
      console.error(`  ✗ "${sub.Name || sub.name}": ${error.message}`)
    } else {
      subjectIdMap.set(sub.$id, data.id)
      console.log(`  ✓ "${sub.Name || sub.name}" → ${data.id}`)
    }
  }

  // ── 2. Migrate questions ───────────────────────────────────────────────────
  console.log(`\nStep 2: Fetching questions from Appwrite...`)
  const questions = await fetchAllFromAppwrite(QUESTIONS_COL)
  console.log(`Found ${questions.length} questions\n`)

  const BATCH = 50
  let inserted = 0
  let failed = 0

  for (let i = 0; i < questions.length; i += BATCH) {
    const batch = questions.slice(i, i + BATCH).map((q: any) => ({
      subject_id: subjectIdMap.get(q.subject_id) ?? null,
      exam_type: q.exam_type || null,
      year: q.year || null,
      paper: q.paper || null,
      paper_label: q.paper_label || null,
      question_text: q.question_text,
      option_a: q.option_a || null,
      option_b: q.option_b || null,
      option_c: q.option_c || null,
      option_d: q.option_d || null,
      correct_option: q.correct_option,
      explanation: q.explanation || null,
      difficulty: q.difficulty || null,
      subtopic: q.subtopic || null,
      tags: Array.isArray(q.tags) ? q.tags : [],
      is_active: q.is_active !== false,
      expected_time_seconds: q.expected_time_seconds || null,
    }))

    const { error } = await sb.from('questions').insert(batch)
    if (error) {
      console.error(`  ✗ Batch ${i}–${i + BATCH}: ${error.message}`)
      failed += batch.length
    } else {
      inserted += batch.length
      console.log(`  ✓ ${Math.min(inserted, questions.length)}/${questions.length} inserted`)
    }
    await new Promise(r => setTimeout(r, 50))
  }

  // ── 3. Verify ──────────────────────────────────────────────────────────────
  console.log('\nStep 3: Verifying...')
  const { count: sCount } = await sb.from('subjects').select('*', { count: 'exact', head: true })
  const { count: qCount } = await sb.from('questions').select('*', { count: 'exact', head: true })

  console.log(`\n${'='.repeat(40)}`)
  console.log(`Supabase: ${sCount} subjects, ${qCount} questions`)
  console.log(`Appwrite: ${subjects.length} subjects, ${questions.length} questions`)
  if (failed > 0) console.log(`Failed: ${failed} questions`)
  console.log(`${'='.repeat(40)}`)
  console.log(sCount === subjects.length && qCount === (questions.length - failed)
    ? '✅ Migration complete!'
    : '⚠️  Count mismatch — check errors above')
}

main().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
