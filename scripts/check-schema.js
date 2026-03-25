const { Client, Databases } = require('node-appwrite');
require('dotenv').config({ path: '.env.local' });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function checkAttributes() {
  const collections = ['profiles', 'test_sessions'];
  for (const c of collections) {
    try {
      console.log(`\nChecking attributes/indexes for: ${c}`);
      const col = await databases.getCollection(process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID, c);
      console.log('- Attributes:', col.attributes.map(a => a.key).join(', '));
      console.log('- Indexes:', col.indexes.map(i => `${i.key} (${i.attributes.join(',')})`).join(', '));
    } catch (e) {
      console.error(`- Error checking ${c}:`, e.message);
    }
  }
}

checkAttributes();
