// scripts/patch-database.ts
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!URL || !KEY) {
    console.error('Missing env')
    process.exit(1)
}

const sb = createClient(URL, KEY)
const HISTORY_ID = '82b6b4ba-b154-4e22-9899-6c45215dcb66'

async function patch() {
    console.log('--- Patching History Questions ---')
    
    // 1. Check current state
    const { data: allHistory } = await sb.from('questions')
        .select('id, exam_type')
        .eq('subject_id', HISTORY_ID)
    
    console.log(`Found ${allHistory?.length || 0} History questions total.`)
    
    if (!allHistory) return

    // 2. Update all to INDICORE_MOCK so they work in mocks AND subject practice
    console.log('Updating all History questions to INDICORE_MOCK...')
    const { error } = await sb.from('questions')
        .update({ exam_type: 'INDICORE_MOCK' })
        .eq('subject_id', HISTORY_ID)
    
    if (error) {
        console.error('Update failed:', error.message)
    } else {
        console.log('✅ Successfully updated all History questions to INDICORE_MOCK.')
    }

    // 3. Verify
    const { count } = await sb.from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('exam_type', 'INDICORE_MOCK')
    
    console.log(`Total INDICORE_MOCK questions now: ${count}`)
}

patch()
