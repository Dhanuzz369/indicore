const fs = require('fs')
const path = require('path')
const { Client, Databases, ID } = require('node-appwrite')

require('dotenv').config({ path: path.join(__dirname, '../.env.local') })

// ── Validate env vars ─────────────────────────────────────────────
const REQUIRED = [
    'NEXT_PUBLIC_APPWRITE_ENDPOINT',
    'NEXT_PUBLIC_APPWRITE_PROJECT_ID',
    'NEXT_PUBLIC_APPWRITE_DATABASE_ID',
    'NEXT_PUBLIC_COLLECTION_QUESTIONS',
    'APPWRITE_API_KEY'
]
for (const key of REQUIRED) {
    if (!process.env[key]) {
        console.error(`❌ Missing env var: ${key}`)
        process.exit(1)
    }
}

// ── Appwrite client ───────────────────────────────────────────────
const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY)

const databases = new Databases(client)
const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID
const TABLE_ID = process.env.NEXT_PUBLIC_COLLECTION_QUESTIONS

// ── Subject keywords ──────────────────────────────────────────────
const SUBJECT_KEYWORDS = {
    geography: [
        'solar radiation', 'terrestrial', 'atmosphere', 'monsoon', 'rainfall',
        'river', 'mountain', 'plateau', 'earthquake', 'volcano', 'pyroclastic',
        'latitude', 'longitude', 'climate', 'ocean', 'tide', 'erosion', 'delta',
        'glacier', 'cyclone', 'humidity', 'wind', 'soil', 'rock', 'tectonic',
        'greenhouse', 'ozone', 'insolation', 'isotherm', 'troposphere',
        'stratosphere', 'western ghats', 'eastern ghats', 'himalayas', 'deccan',
        'peninsula', 'ganga', 'brahmaputra', 'cocoa', 'gulf stream', 'temperature',
        'precipitation', 'evaporation', 'fog', 'mist', 'continent', 'landmass'
    ],
    polity: [
        'constitution', 'fundamental rights', 'parliament', 'president',
        'governor', 'supreme court', 'high court', 'directive principles',
        'amendment', 'lok sabha', 'rajya sabha', 'preamble', 'article',
        'election commission', 'attorney general', 'federal', 'judiciary',
        'writ', 'bill', 'ordinance', 'speaker', 'vice president',
        'prime minister', 'cabinet', 'schedule', 'citizenship', 'emergency',
        'tribunal', 'comptroller', 'auditor', 'union list', 'state list'
    ],
    history: [
        'mughal', 'british', 'revolt', 'independence', 'gandhi', 'nehru',
        'ancient', 'medieval', 'colonial', 'indus valley', 'vedic', 'maurya',
        'gupta', 'maratha', 'battle of', 'treaty of', 'nationalist', 'congress',
        'partition', 'harappan', 'buddha', 'jain', 'ashoka', 'akbar', 'aurangzeb',
        'plassey', 'buxar', 'swadeshi', 'quit india', 'salt march', 'khilafat'
    ],
    economy: [
        'gdp', 'inflation', 'fiscal', 'monetary', 'rbi', 'bank', 'budget',
        'tax', 'gst', 'trade', 'export', 'import', 'poverty', 'unemployment',
        'niti aayog', 'planning commission', 'msme', 'subsidy', 'deficit',
        'repo rate', 'crr', 'slr', 'sebi', 'stock market', 'mutual fund',
        'balance of payment', 'current account', 'capital account', 'fdi'
    ],
    environment: [
        'ecosystem', 'biodiversity', 'species', 'wildlife', 'forest',
        'pollution', 'climate change', 'carbon', 'national park',
        'tiger reserve', 'ramsar', 'coral reef', 'mangrove', 'wetland',
        'endangered', 'biosphere', 'deforestation', 'paris agreement',
        'kyoto', 'cop', 'unfccc', 'iucn', 'red list', 'endemic', 'extinction'
    ],
    'science-tech': [
        'nuclear', 'isro', 'satellite', 'rocket', 'technology', 'internet',
        'artificial intelligence', 'vaccine', 'disease', 'dna', 'gene',
        'nanotechnology', 'space', 'mars', 'moon', 'drdo',
        '5g', 'quantum', 'semiconductor', 'photosynthesis', 'element',
        'compound', 'acid', 'base', 'periodic table', 'electricity', 'magnet'
    ],
    'art-culture': [
        'dance', 'music', 'painting', 'sculpture', 'temple', 'festival',
        'folk', 'classical', 'bhakti', 'sufi', 'architecture', 'cave',
        'ajanta', 'ellora', 'kathakali', 'bharatanatyam', 'literature',
        'poet', 'saint', 'craft', 'heritage', 'inscription', 'manuscript'
    ]
}

const SUBJECT_ID_MAP = {
    'geography': 'geography',
    'polity': 'polity',
    'history': 'history',
    'economy': 'economy',
    'environment': 'environment',
    'science-tech': 'science-tech',
    'art-culture': 'art-culture',
    'general': 'geography'
}

function detectSubject(questionText, explanation) {
    const text = (questionText + ' ' + explanation).toLowerCase()
    let best = { subject: 'general', score: 0 }
    for (const [subject, keywords] of Object.entries(SUBJECT_KEYWORDS)) {
        const score = keywords.reduce((acc, kw) =>
            acc + (text.includes(kw) ? 1 : 0), 0)
        if (score > best.score) best = { subject, score }
    }
    return best.subject
}

function detectDifficulty(questionText) {
    const text = questionText.toLowerCase()
    const hard = [
        'consider the following statements', 'statement-i', 'statement i',
        'how many of the above', 'how many of the following',
        'assertion', 'reason', 'arrange the following',
        'correct sequence', 'which of the following pairs',
        'consider the following pairs'
    ]
    const easy = [
        'which one of the following', 'who among the following',
        'when was', 'what is', 'capital of', 'headquarter', 'known as'
    ]
    if (hard.some(p => text.includes(p))) return 'hard'
    if (easy.some(p => text.includes(p))) return 'easy'
    return 'medium'
}

function parseOptions(optionsCell) {
    if (!optionsCell) return null
    const result = { a: '', b: '', c: '', d: '' }

    // Strategy 1: split by newlines
    const lines = optionsCell.split('\n').map(l => l.trim()).filter(Boolean)
    for (const line of lines) {
        const match = line.match(/^\(?([abcdABCD])\)?[.)]\s*(.+)/)
        if (match) result[match[1].toLowerCase()] = match[2].trim()
    }

    // Strategy 2: regex on full string
    if (!result.b) {
        const aM = optionsCell.match(/\(?a\)?[.)]\s*([\s\S]+?)(?=\(?b\)?[.])/i)
        const bM = optionsCell.match(/\(?b\)?[.)]\s*([\s\S]+?)(?=\(?c\)?[.])/i)
        const cM = optionsCell.match(/\(?c\)?[.)]\s*([\s\S]+?)(?=\(?d\)?[.])/i)
        const dM = optionsCell.match(/\(?d\)?[.)]\s*([\s\S]+?)$/i)
        if (aM) result.a = aM[1].trim()
        if (bM) result.b = bM[1].trim()
        if (cM) result.c = cM[1].trim()
        if (dM) result.d = dM[1].trim()
    }

    if (!result.a || !result.b || !result.c || !result.d) return null
    return result
}

// ── Manual CSV parser (handles multiline quoted cells properly) ───
function parseCSVManually(filePath) {
    const content = fs.readFileSync(filePath, 'utf8')
    const rows = []
    let i = 0

    // Skip header line
    while (i < content.length && content[i] !== '\n') i++
    i++ // skip the newline

    while (i < content.length) {
        const row = []

        // Parse each row
        while (i < content.length) {
            if (content[i] === '"') {
                // Quoted field — read until closing quote
                i++ // skip opening quote
                let field = ''
                while (i < content.length) {
                    if (content[i] === '"' && content[i + 1] === '"') {
                        // Escaped quote inside field
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
                // Unquoted field — read until comma or newline
                let field = ''
                while (i < content.length && content[i] !== ',' && content[i] !== '\n') {
                    if (content[i] === '\r') { i++; continue }
                    field += content[i]
                    i++
                }
                row.push(field.trim())
            }

            // After field: check what comes next
            if (i < content.length && content[i] === ',') {
                i++ // move past comma, read next field
            } else {
                // End of row (newline or EOF)
                if (i < content.length && content[i] === '\r') i++
                if (i < content.length && content[i] === '\n') i++
                break
            }
        }

        if (row.length >= 4) rows.push(row)
    }

    return rows
}

// ── Main import ───────────────────────────────────────────────────
async function importCSV(csvPath, examType, year) {
    console.log('\n' + '═'.repeat(52))
    console.log('  INDICORE — Question Importer')
    console.log('═'.repeat(52))
    console.log(`  File  : ${csvPath}`)
    console.log(`  Exam  : ${examType}  |  Year : ${year}`)
    console.log(`  DB    : ${DB_ID}`)
    console.log(`  Table : ${TABLE_ID}`)
    console.log('═'.repeat(52) + '\n')

    console.log('📂 Parsing CSV...')
    const records = parseCSVManually(csvPath)
    console.log(`📊 Total rows found: ${records.length}\n`)

    if (records.length === 0) {
        console.error('❌ No rows found. Check your CSV file.')
        process.exit(1)
    }

    // Preview first row
    console.log('👀 Preview of Row 1:')
    console.log(`   Q: ${(records[0][1] || '').slice(0, 80).replace(/\n/g, ' ')}`)
    console.log(`   A: ${records[0][3] || ''}`)
    console.log('')

    let success = 0
    let skipped = 0
    let failed = 0
    const errors = []
    const subjectCount = {}

    for (let i = 0; i < records.length; i++) {
        const row = records[i]

        const questionText = (row[1] || '').trim()
        const optionsCell = (row[2] || '').trim()
        const answerRaw = (row[3] || '').trim()
        const explanation = (row[4] || '').trim()

        if (!questionText || questionText.length < 15) {
            skipped++
            continue
        }

        const answerMatch = answerRaw.match(/([abcdABCD])/)
        const correctOption = answerMatch ? answerMatch[1].toUpperCase() : null
        if (!correctOption) {
            console.log(`\n⚠️  Row ${i + 2}: Bad answer "${answerRaw}" — skipping`)
            skipped++
            continue
        }

        const options = parseOptions(optionsCell)
        if (!options) {
            console.log(`\n⚠️  Row ${i + 2}: Cannot parse options — skipping`)
            console.log(`   Raw: ${optionsCell.slice(0, 120).replace(/\n/g, ' | ')}`)
            skipped++
            continue
        }

        const subject = detectSubject(questionText, explanation)
        const difficulty = detectDifficulty(questionText)
        const subjectId = SUBJECT_ID_MAP[subject] || 'geography'

        subjectCount[subject] = (subjectCount[subject] || 0) + 1

        try {
            await databases.createDocument(DB_ID, TABLE_ID, ID.unique(), {
                subject_id: subjectId,
                exam_type: examType,
                year: year,
                paper: 'Prelims GS1',
                question_text: questionText.slice(0, 2000),
                option_a: options.a.slice(0, 500),
                option_b: options.b.slice(0, 500),
                option_c: options.c.slice(0, 500),
                option_d: options.d.slice(0, 500),
                correct_option: correctOption,
                explanation: explanation.slice(0, 3000),
                difficulty: difficulty,
                is_active: true,
            })

            success++
            const pct = Math.round((success / records.length) * 100)
            const bar = '█'.repeat(Math.floor(pct / 5)).padEnd(20, '░')
            process.stdout.write(
                `\r  [${bar}] ${pct}% — ${success}/${records.length} uploaded`
            )

            await new Promise(r => setTimeout(r, 200))

        } catch (err) {
            failed++
            errors.push({
                row: i + 2,
                question: questionText.slice(0, 80),
                error: err.message
            })
        }
    }

    // Report
    console.log('\n\n' + '─'.repeat(52))
    console.log(`  ✅ Uploaded : ${success}`)
    console.log(`  ⏭️  Skipped  : ${skipped}`)
    console.log(`  ❌ Failed   : ${failed}`)
    console.log('─'.repeat(52))

    if (Object.keys(subjectCount).length > 0) {
        console.log('\n📊 Subject Distribution:')
        Object.entries(subjectCount)
            .sort((a, b) => b[1] - a[1])
            .forEach(([s, c]) => console.log(`   ${s.padEnd(28)} → ${c}`))
    }

    if (errors.length > 0) {
        const errPath = csvPath.replace('.csv', '_errors.json')
        fs.writeFileSync(errPath, JSON.stringify(errors, null, 2))
        console.log(`\n⚠️  Errors saved to: ${errPath}`)
        console.log('   First error:', errors[0]?.error)
    }

    console.log('\n🎉 Done!\n')
}

// CLI
const args = process.argv.slice(2)
const csvFile = args[0]
const examType = (args[1] || 'UPSC').toUpperCase()
const year = parseInt(args[2]) || 2024

if (!csvFile) {
    console.log(`
Usage:
  node scripts/import-csv.js <csv> <exam> <year>

Example:
  node scripts/import-csv.js scripts/data/upsc_pre24.csv UPSC 2024
  `)
    process.exit(1)
}

if (!fs.existsSync(csvFile)) {
    console.error(`❌ File not found: ${csvFile}`)
    process.exit(1)
}

importCSV(csvFile, examType, year).catch(err => {
    console.error('\n❌ Fatal error:', err.message)
    process.exit(1)
})