const path = require('path')
const { Client, Databases, Query } = require('node-appwrite')

require('dotenv').config({ path: path.join(__dirname, '../.env.local') })

const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY)

const databases = new Databases(client)
const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID
const TABLE_ID = process.env.NEXT_PUBLIC_COLLECTION_QUESTIONS

async function fetchQuestions() {
    const response = await databases.listDocuments(DB_ID, TABLE_ID, [
        Query.limit(100)
    ])
    const q = response.documents.find(d => d.question_text.includes('fertility'));
    console.log(JSON.stringify(q, null, 2));
}
fetchQuestions()
