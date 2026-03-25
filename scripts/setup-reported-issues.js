const { Client, Databases, ID } = require('node-appwrite');
require('dotenv').config({ path: '.env.local' });

const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

async function setupReportedIssues() {
    try {
        console.log('Creating reported_issues collection...');
        const collection = await databases.createCollection(
            DATABASE_ID,
            ID.unique(),
            'reported_issues'
        );
        const COLLECTION_ID = collection.$id;
        console.log('Collection created:', COLLECTION_ID);

        // Add attributes
        const attributes = [
            { name: 'user_id', type: 'string', size: 255, required: true },
            { name: 'question_id', type: 'string', size: 255, required: true },
            { name: 'mode', type: 'string', size: 50, required: false }, // full_length or subject
            { name: 'status', type: 'string', size: 50, required: false, default: 'pending' },
            { name: 'reported_at', type: 'datetime', required: true }
        ];

        for (const attr of attributes) {
            console.log(`Adding attribute ${attr.name}...`);
            if (attr.type === 'string') {
                await databases.createStringAttribute(DATABASE_ID, COLLECTION_ID, attr.name, attr.size, attr.required, attr.default);
            } else if (attr.type === 'datetime') {
                await databases.createDatetimeAttribute(DATABASE_ID, COLLECTION_ID, attr.name, attr.required);
            }
        }

        console.log('Setup complete! Please update your .env.local with:');
        console.log(`NEXT_PUBLIC_COLLECTION_REPORTED_ISSUES=${COLLECTION_ID}`);

    } catch (error) {
        console.error('Error:', error);
    }
}

setupReportedIssues();
