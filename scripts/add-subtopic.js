const { Client, Databases } = require('node-appwrite');
require('dotenv').config({ path: '.env.local' });
const client = new Client().setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT).setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID).setKey(process.env.APPWRITE_API_KEY);
const db = new Databases(client);
(async () => {
    try {
        await db.createStringAttribute(process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID, process.env.NEXT_PUBLIC_COLLECTION_QUESTIONS, 'subtopic', 255, false);
        console.log('Added subtopic attribute');
    } catch(e) { console.log(e.message) }
})();
