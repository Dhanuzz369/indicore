const { Client, Databases, Permission, Role } = require('node-appwrite');
require('dotenv').config({ path: '.env.local' });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

async function fixPermissions() {
  const configs = [
    { 
      id: process.env.NEXT_PUBLIC_COLLECTION_SUBJECTS, 
      perms: [Permission.read(Role.any())],
      security: false
    },
    { 
      id: process.env.NEXT_PUBLIC_COLLECTION_QUESTIONS, 
      perms: [Permission.read(Role.any())],
      security: false
    },
    { 
      id: process.env.NEXT_PUBLIC_COLLECTION_PROFILES, 
      perms: [Permission.create(Role.users()), Permission.read(Role.users()), Permission.update(Role.users()), Permission.delete(Role.users())],
      security: true
    },
    { 
      id: process.env.NEXT_PUBLIC_COLLECTION_ATTEMPTS, 
      perms: [Permission.create(Role.users()), Permission.read(Role.users()), Permission.update(Role.users()), Permission.delete(Role.users())],
      security: true
    },
    { 
      id: process.env.NEXT_PUBLIC_COLLECTION_TEST_SESSIONS, 
      perms: [Permission.create(Role.users()), Permission.read(Role.users()), Permission.update(Role.users()), Permission.delete(Role.users())],
      security: true
    },
    { 
      id: process.env.NEXT_PUBLIC_COLLECTION_REPORTED_ISSUES, 
      perms: [Permission.create(Role.users()), Permission.read(Role.users())],
      security: true
    },
    { 
      id: process.env.NEXT_PUBLIC_COLLECTION_STATS, 
      perms: [Permission.create(Role.users()), Permission.read(Role.users()), Permission.update(Role.users())],
      security: true
    },
    { 
      id: process.env.NEXT_PUBLIC_COLLECTION_USER_TEST_SUMMARY, 
      perms: [Permission.create(Role.users()), Permission.read(Role.users())],
      security: true
    }
  ];

  for (const config of configs) {
    if (!config.id) continue;
    try {
      console.log(`Setting permissions for ${config.id}...`);
      await databases.updateCollection(
        DATABASE_ID,
        config.id,
        config.id, // name
        config.perms,
        config.security
      );
      console.log(`✅ Success`);
    } catch (e) {
      console.error(`❌ Failed for ${config.id}:`, e.message);
    }
  }
}

fixPermissions();
