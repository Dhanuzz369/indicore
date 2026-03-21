const fs = require('fs')
const path = require('path')
const { Client, Databases, ID } = require('node-appwrite')

require('dotenv').config({ path: path.join(__dirname, '../.env.local') })

const REQUIRED = [
    'NEXT_PUBLIC_APPWRITE_ENDPOINT',
    'NEXT_PUBLIC_APPWRITE_PROJECT_ID',
    'NEXT_PUBLIC_APPWRITE_DATABASE_ID',
    'APPWRITE_API_KEY'
]

for (const key of REQUIRED) {
    if (!process.env[key]) {
        console.error(`❌ Missing env var: ${key}`)
        process.exit(1)
    }
}

const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY)

const databases = new Databases(client)
const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID

const questionsCol = process.env.NEXT_PUBLIC_COLLECTION_QUESTIONS
const attemptsCol = process.env.NEXT_PUBLIC_COLLECTION_ATTEMPTS

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function setup() {
    console.log('🚀 Starting Analytics Schema Setup Context...\n')

    try {
        console.log('🔄 Adding [subtopic] to QUESTIONS collection...')
        await databases.createStringAttribute(dbId, questionsCol, 'subtopic', 255, false)
    } catch (e) {
        if (e.code === 409) console.log('✅ Attribute [subtopic] already exists.')
        else console.error('❌ Failed to create subtopic:', e.message)
    }

    try {
        console.log('🔄 Adding [confidence_tag] to ATTEMPTS collection...')
        await databases.createStringAttribute(dbId, attemptsCol, 'confidence_tag', 50, false)
    } catch (e) {
        if (e.code === 409) console.log('✅ Attribute [confidence_tag] already exists.')
        else console.error('❌ Failed to create confidence_tag:', e.message)
    }

    try {
        console.log('🔄 Adding [selection_history] to ATTEMPTS collection...')
        await databases.createStringAttribute(dbId, attemptsCol, 'selection_history', 10000, false)
    } catch (e) {
        if (e.code === 409) console.log('✅ Attribute [selection_history] already exists.')
        else console.error('❌ Failed to create selection_history:', e.message)
    }

    // Give it a short delay for attributes to settle
    await wait(1000)

    let summaryColId = process.env.NEXT_PUBLIC_COLLECTION_USER_TEST_SUMMARY
    if (!summaryColId) {
        try {
            console.log('\n📦 Creating User Test Summary Collection...')
            const summaryCol = await databases.createCollection(dbId, ID.unique(), 'User Test Summary')
            summaryColId = summaryCol.$id
            console.log(`✅ Collection created: ${summaryColId}`)

            // Update .env.local
            const envPath = path.join(__dirname, '../.env.local')
            fs.appendFileSync(envPath, `\nNEXT_PUBLIC_COLLECTION_USER_TEST_SUMMARY=${summaryColId}\n`)
            console.log('✅ Added NEXT_PUBLIC_COLLECTION_USER_TEST_SUMMARY to .env.local')

        } catch (e) {
            console.error('❌ Failed to create collection:', e.message)
            return
        }
    } else {
        console.log(`\n✅ User Test Summary Collection already exists: ${summaryColId}`)
    }

    console.log('\n🔄 Creating attributes for User Test Summary Collection...')
    const attrs = [
        { type: 'string', name: 'user_id', size: 255, req: true },
        { type: 'string', name: 'test_id', size: 255, req: true },
        { type: 'string', name: 'date', size: 255, req: true },
        { type: 'float', name: 'total_score', req: true },
        { type: 'string', name: 'subject_scores', size: 5000, req: true },
        { type: 'string', name: 'difficulty_scores', size: 5000, req: true },
        { type: 'float', name: 'accuracy', req: true },
        { type: 'integer', name: 'attempts_count', req: true },
        { type: 'string', name: 'confidence_stats', size: 5000, req: true }
    ]

    for (const attr of attrs) {
        try {
            if (attr.type === 'string') {
                await databases.createStringAttribute(dbId, summaryColId, attr.name, attr.size, attr.req)
            } else if (attr.type === 'float') {
                // In generic appwrite we pass min/max as optional, so we skip it to remove boundaries
                await databases.createFloatAttribute(dbId, summaryColId, attr.name, attr.req)
            } else if (attr.type === 'integer') {
                await databases.createIntegerAttribute(dbId, summaryColId, attr.name, attr.req)
            }
            console.log(`   ✅ Requested creation of [${attr.name}]`)
            await wait(200)
        } catch (e) {
            if (e.code === 409) console.log(`   ✅ Attribute [${attr.name}] already exists.`)
            else {
                console.error(`   ❌ Failed [${attr.name}]:`, e.message)
            }
        }
    }

    console.log('\n✅ Script Complete! All attributes requested.')
    console.log('Notice: Appwrite processes attributes asynchronously. It may take 1-2 minutes for the database status to fully migrate and be "available".')
}

setup()
