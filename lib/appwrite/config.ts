import { Client, Account, Databases, Storage } from 'appwrite'

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)

export const account = new Account(client)
export const databases = new Databases(client)
export const storage = new Storage(client)
export { client }

// IDs
export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!
export const STORAGE_BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID ?? ''
export const COLLECTIONS = {
  PROFILES:         process.env.NEXT_PUBLIC_COLLECTION_PROFILES!,
  QUESTIONS:        process.env.NEXT_PUBLIC_COLLECTION_QUESTIONS!,
  SUBJECTS:         process.env.NEXT_PUBLIC_COLLECTION_SUBJECTS!,
  ATTEMPTS:         process.env.NEXT_PUBLIC_COLLECTION_ATTEMPTS!,
  STATS:            process.env.NEXT_PUBLIC_COLLECTION_STATS!,
  USER_TEST_SUMMARY: process.env.NEXT_PUBLIC_COLLECTION_USER_TEST_SUMMARY!,
  TEST_SESSIONS:    process.env.NEXT_PUBLIC_COLLECTION_TEST_SESSIONS!,
  REPORTED_ISSUES: process.env.NEXT_PUBLIC_COLLECTION_REPORTED_ISSUES!,
}