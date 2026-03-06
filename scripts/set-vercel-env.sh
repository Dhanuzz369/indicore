#!/bin/bash
# Sets all Appwrite env vars on Vercel for all three environments

ENVS=("production" "preview" "development")

declare -A VARS
VARS[NEXT_PUBLIC_APPWRITE_ENDPOINT]="https://sgp.cloud.appwrite.io/v1"
VARS[NEXT_PUBLIC_APPWRITE_PROJECT_ID]="69a53069003364bd79a9"
VARS[NEXT_PUBLIC_APPWRITE_DATABASE_ID]="69a532300028cf0c21bd"
VARS[NEXT_PUBLIC_COLLECTION_PROFILES]="profiles"
VARS[NEXT_PUBLIC_COLLECTION_QUESTIONS]="questions"
VARS[NEXT_PUBLIC_COLLECTION_SUBJECTS]="subjects"
VARS[NEXT_PUBLIC_COLLECTION_ATTEMPTS]="quiz_attempts"
VARS[NEXT_PUBLIC_COLLECTION_STATS]="user"

for KEY in "${!VARS[@]}"; do
  VAL="${VARS[$KEY]}"
  for ENV in "${ENVS[@]}"; do
    echo "➕ Setting $KEY → $ENV"
    printf "%s" "$VAL" | vercel env add "$KEY" "$ENV" 2>&1 | grep -E "✅|Error|already"
  done
done

echo ""
echo "✅ Done! Run: vercel env ls"
