const { Client, Databases, ID } = require('node-appwrite');
require('dotenv').config({ path: '.env.local' });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function testTestSession() {
  const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
  const COLL_ID = 'test_sessions';
  try {
    console.log('Testing Test Session creation...');
    const result = await databases.createDocument(
      DATABASE_ID,
      COLL_ID,
      ID.unique(),
      {
        user_id: 'test_user_123',
        exam_type: 'UPSC',
        year: 2024,
        paper: 'GS1',
        paper_label: 'Test Mock',
        mode: 'full_length',
        started_at: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
        total_time_seconds: 3600,
        total_questions: 100,
        attempted: 100,
        correct: 80,
        incorrect: 20,
        skipped: 0,
        score: 80,
        analytics: '{}',
        ai_feedback: ''
      }
    );
    console.log('✅ Success:', result.$id);
    
    // Cleanup
    await databases.deleteDocument(DATABASE_ID, COLL_ID, result.$id);
    console.log('✅ Cleanup Success');
  } catch (e) {
    console.error('❌ Failed:', e.message);
  }
}

testTestSession();
