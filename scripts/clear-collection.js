const path = require('path')
const { Client, Databases } = require('node-appwrite')

require('dotenv').config({ path: path.join(__dirname, '../.env.local') })

const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY)

const databases = new Databases(client)
const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID
const TABLE_ID = process.env.NEXT_PUBLIC_COLLECTION_QUESTIONS

async function clearData() {
    console.log('Fetching documents to delete...')
    let deleted = 0
    let hasMore = true

    while (hasMore) {
        const response = await databases.listDocuments(DB_ID, TABLE_ID)
        const docs = response.documents

        if (docs.length === 0) {
            hasMore = false
            break
        }

        const promises = docs.map(doc => databases.deleteDocument(DB_ID, TABLE_ID, doc.$id))
        await Promise.all(promises)
        deleted += docs.length
        console.log(`Deleted ${deleted} documents...`)
    }

    console.log('Done clearing database!')
}

clearData().catch(console.error)
