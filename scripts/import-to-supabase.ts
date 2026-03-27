// scripts/import-to-supabase.ts
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase env variables (URL or SERVICE_ROLE_KEY)')
    process.exit(1)
}

const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ── Configuration ──────────────────────────────────────────────
const HISTORY_SUBJECT_ID = '82b6b4ba-b154-4e22-9899-6c45215dcb66'

// ── CSV Parser (handles multiline quoted cells) ───────────────
function parseCSVManually(filePath: string) {
    const content = fs.readFileSync(filePath, 'utf8')
    const rows: string[][] = []
    let i = 0

    // Skip header line
    while (i < content.length && content[i] !== '\n') i++
    i++ // skip the newline

    while (i < content.length) {
        const row: string[] = []
        while (i < content.length) {
            if (content[i] === '"') {
                i++ // skip opening quote
                let field = ''
                while (i < content.length) {
                    if (content[i] === '"' && content[i + 1] === '"') {
                        field += '"'
                        i += 2
                    } else if (content[i] === '"') {
                        i++ // skip closing quote
                        break
                    } else {
                        field += content[i]
                        i++
                    }
                }
                row.push(field)
            } else {
                let field = ''
                while (i < content.length && content[i] !== ',' && content[i] !== '\n') {
                    if (content[i] === '\r') { i++; continue }
                    field += content[i]
                    i++
                }
                row.push(field.trim())
            }
            if (i < content.length && content[i] === ',') {
                i++
            } else {
                if (i < content.length && content[i] === '\r') i++
                if (i < content.length && content[i] === '\n') i++
                break
            }
        }
        if (row.length >= 4) rows.push(row)
    }
    return rows
}

// ── Option Parser (robust multiline) ──────────────────────────
function parseOptions(optionsCell: string) {
    if (!optionsCell) return null
    const result: Record<string, string> = { a: '', b: '', c: '', d: '' }
    let currentKey: string | null = null
    const lines = optionsCell.split('\n')
    for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) {
            if (currentKey) result[currentKey] += '\n'
            continue
        }
        const match = trimmed.match(/^\(?([abcdABCD])\)?[.)]\s*(.+)/)
        if (match) {
            currentKey = match[1].toLowerCase()
            result[currentKey] = match[2].trim()
        } else if (currentKey) {
            const prefix = result[currentKey] && !result[currentKey].endsWith('\n') ? '\n' : ''
            result[currentKey] += prefix + trimmed
        }
    }
    if (result.a && result.b && result.c && result.d) return result
    return null
}

// ── Difficulty Detector ──────────────────────────────────────
function detectDifficulty(questionText: string) {
    const text = questionText.toLowerCase()
    const hard = ['consider the following statements', 'statement-i', 'how many of the above', 'arrange the following', 'correct sequence']
    const easy = ['which one of the following', 'who among the following', 'when was', 'what is', 'capital of']
    if (hard.some(p => text.includes(p))) return 'hard'
    if (easy.some(p => text.includes(p))) return 'easy'
    return 'medium'
}

// ── Main Import Logic ────────────────────────────────────────
async function importToSupabase(csvPath: string, examType: string, year: number) {
    console.log(`\n🚀 Starting Supabase Import: ${path.basename(csvPath)}`)
    console.log(`📊 Target: ${examType} ${year}\n`)

    const records = parseCSVManually(csvPath)
    console.log(`📁 Found ${records.length} records in CSV.\n`)

    let success = 0
    let failed = 0
    const BATCH_SIZE = 20

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE)
        const toInsert: any[] = []

        for (const row of batch) {
            const questionText = (row[1] || '').trim()
            const optionsCell = (row[2] || '').trim()
            const answerRaw = (row[3] || '').trim()
            const explanation = (row[4] || '').trim()
            const difficultyRow = (row[5] || '').trim()
            const timePeriod = (row[6] || '').trim()
            const subtopic = (row[7] || '').trim()

            if (!questionText || questionText.length < 10) continue

            const answerMatch = answerRaw.match(/([abcdABCD])/)
            const correctOption = answerMatch ? answerMatch[1].toUpperCase() : null
            if (!correctOption) continue

            const options = parseOptions(optionsCell)
            if (!options) continue

            const difficulty = difficultyRow.toLowerCase() || detectDifficulty(questionText)

            toInsert.push({
                subject_id: HISTORY_SUBJECT_ID,
                exam_type: examType,
                year,
                paper: 'Prelims GS1',
                question_text: questionText,
                option_a: options.a,
                option_b: options.b,
                option_c: options.c,
                option_d: options.d,
                correct_option: correctOption,
                explanation: explanation,
                difficulty: difficulty,
                subtopic: subtopic || timePeriod,
                tags: [timePeriod, subtopic].filter(Boolean),
                is_active: true,
                expected_time_seconds: 60
            })
        }

        if (toInsert.length > 0) {
            const { error } = await sb.from('questions').insert(toInsert)
            if (error) {
                console.error(`❌ Batch failed: ${error.message}`)
                failed += toInsert.length
            } else {
                success += toInsert.length
                console.log(`✅ Inserted ${success}/${records.length}...`)
            }
        }
        await new Promise(r => setTimeout(r, 100))
    }

    console.log(`\n🏁 Import Complete!`)
    console.log(`✅ Success: ${success}`)
    console.log(`❌ Failed:  ${failed}\n`)
}

// CLI
const args = process.argv.slice(2)
const csvFile = args[0] || 'scripts/data/pending/IndicoreMCQHistory - History.csv'
const examType = args[1] || 'UPSC'
const year = parseInt(args[2]) || 2024

importToSupabase(csvFile, examType, year).catch(err => {
    console.error(`❌ Fatal Error:`, err)
    process.exit(1)
})
