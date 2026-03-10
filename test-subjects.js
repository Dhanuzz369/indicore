import { Client, Databases } from 'node-appwrite';
import dotenv from 'dotenv';
dotenv.config({ path: '/Users/dhanush/Desktop/INDICORE/indicore/.env.local' });

const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID);

const databases = new Databases(client);

async function check() {
    const result = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_COLLECTION_SUBJECTS
    );
    console.log('KEYS:', Object.keys(result.documents[0]));
    console.log(result.documents[0]);
}
check();
