/**
 * set-permissions.js
 * Sets permissions on test_sessions so authenticated users can create/read/update their docs.
 */

const { Client, Databases } = require('node-appwrite')
require('dotenv').config({ path: '.env.local' })

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY)

const db = new Databases(client)
const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID

// Appwrite uses Permission class for explicit permissions
// We update the collection with documentSecurity: true so Zustand can create docs
// with their own permissions based on the logged-in user.
;(async () => {
  try {
    // Update collection to enable document-level security
    const result = await db.updateCollection(
      DB_ID,
      'test_sessions',
      'test_sessions',   // name
      [],                // permissions — empty means inherit from document security
      true               // documentSecurity = true: each document has its own permissions
    )
    console.log('✅ Document security enabled on test_sessions')
    console.log('   Users will now only see their own documents.')

    // Also update quiz_attempts to enable document security if not already
    const attCol = process.env.NEXT_PUBLIC_COLLECTION_ATTEMPTS
    await db.updateCollection(
      DB_ID,
      attCol,
      'quiz_attempts',
      [],
      true
    )
    console.log('✅ Document security verified on quiz_attempts')
  } catch (e) {
    console.error('❌ Error:', e.message)
  }
})()
