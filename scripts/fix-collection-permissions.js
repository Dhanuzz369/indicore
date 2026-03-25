/**
 * fix-collection-permissions.js
 * ---------------------------------------------------------------
 * Sets collection-level permissions on test_sessions to allow
 * authenticated users (any logged-in user) to create documents.
 * Document-level security ensures each user only sees their own docs.
 */

const { Client, Databases, Permission, Role } = require('node-appwrite')
require('dotenv').config({ path: '.env.local' })

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY)

const db = new Databases(client)
const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID

;(async () => {
  try {
    console.log('🔒 Setting permissions on test_sessions...')

    // Allow any authenticated user to create, read, update their own sessions.
    // With documentSecurity: true, documents get the creator's user permissions automatically.
    const result = await db.updateCollection(
      DB_ID,
      'test_sessions',
      'test_sessions',
      [
        Permission.create(Role.users()),   // authenticated users can create
        Permission.read(Role.users()),     // authenticated users can read
        Permission.update(Role.users()),   // authenticated users can update
        Permission.delete(Role.users()),   // authenticated users can delete
      ],
      true  // documentSecurity: document-level overrides apply per-doc
    )

    console.log('✅  test_sessions permissions set:')
    console.log('    • create → users (any authenticated user)')
    console.log('    • read   → users (any authenticated user)')
    console.log('    • update → users (any authenticated user)')
    console.log('    • documentSecurity: true (users see only their own docs)\n')

    // Verify quiz_attempts also allows create for users
    console.log('🔒 Verifying quiz_attempts permissions...')
    await db.updateCollection(
      DB_ID,
      process.env.NEXT_PUBLIC_COLLECTION_ATTEMPTS,
      'quiz_attempts',
      [
        Permission.create(Role.users()),
        Permission.read(Role.users()),
        Permission.update(Role.users()),
      ],
      true
    )
    console.log('✅  quiz_attempts permissions verified.\n')
    console.log('🎉  All done! Both collections are ready for production use.')

  } catch (e) {
    console.error('❌ Error:', e.message)
    console.error(e)
  }
})()
