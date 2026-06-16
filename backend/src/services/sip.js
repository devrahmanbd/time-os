import { getDb } from '../db.js';
import twilio from 'twilio';

let twilioClientCache = null;

function getTwilioClient() {
  if (twilioClientCache) return twilioClientCache;
  const db = getDb();
  const row = db.prepare('SELECT config FROM channel_config WHERE channel = ?').get('sip');
  if (!row) return null;
  const config = typeof row.config === 'string' ? JSON.parse(row.config || '{}') : (row.config || {});
  if (!config.twilio_sid || !config.twilio_token) return null;
  try {
    twilioClientCache = twilio(config.twilio_sid, config.twilio_token);
    return twilioClientCache;
  } catch (e) {
    console.error('[sip] Failed to init Twilio client:', e.message);
    return null;
  }
}

export class SipService {
  isConfigured() {
    const client = getTwilioClient();
    if (!client) return false;
    const db = getDb();
    const row = db.prepare('SELECT config FROM channel_config WHERE channel = ?').get('sip');
    if (!row) return false;
    const config = typeof row.config === 'string' ? JSON.parse(row.config || '{}') : (row.config || {});
    return !!(client && config.phone_number);
  }

  async makeCall(phoneNumber, message) {
    const client = getTwilioClient();
    if (!client) throw new Error('Twilio not configured');
    const db = getDb();
    const row = db.prepare('SELECT config FROM channel_config WHERE channel = ?').get('sip');
    if (!row) throw new Error('SIP channel not configured');
    const config = typeof row.config === 'string' ? JSON.parse(row.config || '{}') : (row.config || {});
    if (!config.phone_number) throw new Error('SIP phone number not configured');

    const twiml = `<Response><Say voice="alice">${escapeXml(message)}</Say></Response>`;
    await client.calls.create({
      twiml,
      to: phoneNumber,
      from: config.phone_number,
    });
  }
}

function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
