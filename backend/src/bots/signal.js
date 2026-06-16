export class SignalBot {
  constructor() {
    this.apiUrl = process.env.SIGNAL_API_URL;
    this.signalNumber = process.env.SIGNAL_NUMBER;
  }

  isConfigured() {
    return !!(this.apiUrl && this.signalNumber);
  }

  async sendMessage(number, message) {
    if (!this.isConfigured()) {
      console.warn('[signal] Not configured');
      return;
    }
    try {
      const response = await fetch(`${this.apiUrl}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, number: this.signalNumber, recipients: [number] }),
      });
      if (!response.ok) {
        throw new Error(`Signal send failed: ${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (err) {
      console.error('[signal] sendMessage error:', err);
      throw err;
    }
  }
}
