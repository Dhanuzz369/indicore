// scripts/split-exam-types.ts
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

async function split() {
    console.log('--- Splitting History Questions between UPSC_PRE and INDICORE_MOCK ---')
    
    // 1. Get all History questions
    const { data: allHistory } = await sb.from('questions')
        .select('id')
        .eq('subject_id', HISTORY_ID)
    
    if (!allHistory) return
    console.log(`Found ${allHistory.length} total.`)

    // 2. Split (First 100 -> UPSC_PRE, Others -> INDICORE_MOCK)
    const toUpsc = allHistory.slice(0, 100).map(q => q.id)
    const toMock = allHistory.slice(100).map(q => q.id)

    console.log(`Updating ${toUpsc.length} to UPSC_PRE...`)
    await sb.from('questions').update({ exam_type: 'UPSC_PRE' }).in('id', toUpsc)

    console.log(`Updating ${toMock.length} to INDICORE_MOCK...`)
    await sb.from('questions').update({ exam_type: 'INDICORE_MOCK' }).in('id', toMock)

    console.log('✅ Done!')
}

split()
