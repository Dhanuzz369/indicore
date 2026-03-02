// Run this file to get your collection IDs
// Usage: node scripts/get-collection-ids.js

const sdk = require('node-appwrite');

const client = new sdk.Client()
    .setEndpoint('https://sgp.cloud.appwrite.io/v1')
    .setProject('69a53069003364bd79a9')
    .setKey('YOUR_API_KEY_HERE'); // You need to create an API key in Appwrite Console

const databases = new sdk.Databases(client);

async function getCollections() {
    try {
        const collections = await databases.listCollections('69a532300028cf0c21bd');
        
        console.log('📋 Your Collection IDs:\n');
        collections.collections.forEach(collection => {
            console.log(`${collection.name}: ${collection.$id}`);
        });
        
        console.log('\n✅ Copy these IDs to your .env.local file!');
    } catch (error) {
        console.error('Error:', error.message);
    }
}

getCollections();
