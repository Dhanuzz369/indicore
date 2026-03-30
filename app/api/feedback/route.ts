/*
  Feedback API → Google Sheets via Apps Script webhook
  ─────────────────────────────────────────────────────
  Setup (one-time):
  1. Go to https://script.google.com and create a new project.
  2. Paste the Apps Script below, save, and deploy as a Web App
     (Execute as: Me, Who has access: Anyone).
  3. Copy the deployment URL and add it to Vercel env vars as
     FEEDBACK_WEBHOOK_URL (Production + Preview).
  4. Redeploy on Vercel.

  ── Google Apps Script to paste ──────────────────────────────────
  function doPost(e) {
    try {
      var data = JSON.parse(e.postData.contents);
      var sheet = SpreadsheetApp.openById('YOUR_SPREADSHEET_ID')
                                .getSheetByName('Feedback') ||
                  SpreadsheetApp.openById('YOUR_SPREADSHEET_ID')
                                .getActiveSheet();
      if (sheet.getLastRow() === 0) {
        sheet.appendRow([
          'Timestamp','User ID','User Email','Session ID',
          'Test Mode','Rating','Category','Feedback'
        ]);
      }
      sheet.appendRow([
        data.timestamp || new Date().toISOString(),
        data.userId    || '',
        data.userEmail || '',
        data.sessionId || '',
        data.testMode  || '',
        data.rating    || '',
        data.category  || '',
        data.feedback  || '',
      ]);
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch(err) {
      return ContentService
        .createTextOutput(JSON.stringify({ error: err.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  ─────────────────────────────────────────────────────────────────
*/

import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const webhookUrl = process.env.FEEDBACK_WEBHOOK_URL
    if (!webhookUrl) {
      // Fail silently — don't break the user experience if env var is missing
      console.warn('[feedback] FEEDBACK_WEBHOOK_URL not configured')
      return Response.json({ ok: true, note: 'webhook not configured' })
    }

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        userId:    body.userId    ?? '',
        userEmail: body.userEmail ?? '',
        sessionId: body.sessionId ?? '',
        testMode:  body.testMode  ?? '',
        rating:    body.rating    ?? '',
        category:  body.category  ?? '',
        feedback:  body.feedback  ?? '',
      }),
    })

    if (!res.ok) {
      console.error('[feedback] Webhook returned', res.status)
      return Response.json({ error: 'Webhook error' }, { status: 500 })
    }

    return Response.json({ ok: true })
  } catch (err) {
    console.error('[feedback] Error', err)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
