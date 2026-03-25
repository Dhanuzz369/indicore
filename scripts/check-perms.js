const { Client, Databases } = require('node-appwrite');
require('dotenv').config({ path: '.env.local' });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function checkPermissions() {
  const collections = ['profiles', 'test_sessions', 'quiz_attempts', 'reported_issues', 'subjects', 'questions'];
  console.log(`Checking permissions for database: ${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}\n`);
  
  for (const c of collections) {
    try {
      const colId = process.env[`NEXT_PUBLIC_COLLECTION_${c.toUpperCase()}`] || c;
      const col = await databases.getCollection(process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID, colId);
      console.log(`Collection: ${c} (${colId})`);
      console.log(`- Permissions:`, col.permissions);
      console.log(`- Document Level Control:`, col.documentSecurity);
    } catch (e) {
      console.error(`Error for ${c}:`, e.message);
    }
  }
}

checkPermissions();
