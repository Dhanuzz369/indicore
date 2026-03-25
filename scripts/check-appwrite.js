const { Client, Databases } = require('node-appwrite');
require('dotenv').config({ path: '.env.local' });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function check() {
  try {
    console.log('Checking collections in database:', process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID);
    const result = await databases.listCollections(process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID);
    console.log('\nFound Collections:');
    result.collections.forEach(c => {
      console.log(`- Name: ${c.name}, ID: ${c.$id}`);
    });

    console.log('\nVerifying env IDs against actual IDs:');
    const envVars = [
      'NEXT_PUBLIC_COLLECTION_PROFILES',
      'NEXT_PUBLIC_COLLECTION_QUESTIONS',
      'NEXT_PUBLIC_COLLECTION_SUBJECTS',
      'NEXT_PUBLIC_COLLECTION_ATTEMPTS',
      'NEXT_PUBLIC_COLLECTION_STATS',
      'NEXT_PUBLIC_COLLECTION_USER_TEST_SUMMARY',
      'NEXT_PUBLIC_COLLECTION_TEST_SESSIONS',
      'NEXT_PUBLIC_COLLECTION_REPORTED_ISSUES'
    ];

    envVars.forEach(v => {
      const val = process.env[v];
      const match = result.collections.find(c => c.$id === val || c.name === val);
      if (match) {
        console.log(`✅ ${v}=${val} -> Matches collection "${match.name}" (${match.$id})`);
      } else {
        console.log(`❌ ${v}=${val} -> NOT FOUND`);
      }
    });

  } catch (e) {
    console.error('Error checking Appwrite:', e.message);
  }
}

check();
