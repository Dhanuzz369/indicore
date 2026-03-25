const { Client, Databases, ID } = require('node-appwrite');
require('dotenv').config({ path: '.env.local' });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function testCreateProfile() {
  try {
    const testId = 'test_user_' + Date.now();
    console.log('Testing Profile creation for:', testId);
    const result = await databases.createDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
      'profiles',
      testId,
      {
        full_name: 'Test Aspirant',
        target_exam: 'UPSC',
        target_year: 2024
      }
    );
    console.log('✅ Success:', result.$id);
    
    // Cleanup
    await databases.deleteDocument(process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID, 'profiles', testId);
    console.log('✅ Cleanup Success');
  } catch (e) {
    console.error('❌ Failed:', e.message);
  }
}

testCreateProfile();
