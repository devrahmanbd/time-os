import React, { useState, useEffect } from 'react';
import { apiGet, apiPut, apiPost } from '../api';
import { Radio, Repeat, Bell, Send, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

const channelInfo = {
  telegram: { name: 'Telegram', icon: Bell, fields: ['bot_token', 'chat_id'] },
  signal: { name: 'Signal', icon: Repeat, fields: ['api_url', 'number'] },
  sip: { name: 'SIP Calls', icon: Radio, fields: ['twilio_sid', 'twilio_token', 'phone_number'] },
};

const channelIcons = { telegram: Bell, signal: Repeat, sip: Radio };

export default function ChannelsPage() {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [testStatus, setTestStatus] = useState({});
  const [saving, setSaving] = useState(null);

  useEffect(() => { fetchChannels(); }, []);

  const fetchChannels = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet('/channels');
      setChannels(data || []);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const getChannelObj = (channelName) => channels.find(c => c.channel === channelName);

  const toggleChannel = async (ch) => {
    const newEnabled = ch.enabled ? 0 : 1;
    setSaving(ch.channel);
    try {
      await apiPut('/channels/' + ch.channel, { enabled: newEnabled });
      setChannels(channels.map(c => c.channel === ch.channel ? { ...c, enabled: newEnabled } : c));
      setError(null);
    } catch (e) { setError(e.message); }
    setSaving(null);
  };

  const updateConfig = async (channelName, field, value) => {
    setSaving(channelName);
    try {
      const ch = getChannelObj(channelName);
      const config = ch && ch.config ? { ...JSON.parse(ch.config || '{}'), [field]: value } : { [field]: value };
      await apiPut('/channels/' + channelName, { config });
      setChannels(channels.map(c => c.channel === channelName ? { ...c, config: JSON.stringify(config) } : c));
      setError(null);
    } catch (e) { setError(e.message); }
    setSaving(null);
  };

  const testChannel = async (channelName) => {
    setTestStatus({ ...testStatus, [channelName]: 'sending' });
    try {
      await apiPost('/channels/' + channelName + '/test', {});
      setTestStatus({ ...testStatus, [channelName]: 'success' });
      setTimeout(() => setTestStatus(s => ({ ...s, [channelName]: null })), 3000);
    } catch (e) {
      setTestStatus({ ...testStatus, [channelName]: 'error' });
      setTimeout(() => setTestStatus(s => ({ ...s, [channelName]: null })), 3000);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-accent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Channels</h1>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-yellow bg-yellow/10 rounded-lg px-3 py-2">
          <AlertCircle size={14} /> <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {['telegram', 'signal', 'sip'].map(key => {
          const ch = getChannelObj(key);
          const info = channelInfo[key];
          const Icon = info.icon;
          const enabled = ch ? ch.enabled : 0;
          const config = ch ? (typeof ch.config === 'string' ? JSON.parse(ch.config || '{}') : ch.config || {}) : {};
          const status = testStatus[key];

          return (
            <div key={key} className="card space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon size={20} className={enabled ? 'text-accent' : 'text-muted'} />
                  <h3 className="text-lg font-semibold">{info.name}</h3>
                </div>
                <div className="flex items-center gap-2">
                  {saving === key && <Loader2 size={14} className="animate-spin text-accent" />}
                  <button onClick={() => ch && toggleChannel(ch)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${enabled ? 'bg-accent' : 'bg-surface2'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {key === 'telegram' && (
                  <>
                    <div><label className="text-xs text-text2 block mb-1">Bot Token</label>
                      <input className="input text-sm" type="password" value={config.bot_token || ''}
                        onChange={e => updateConfig(key, 'bot_token', e.target.value)}
                        placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11" /></div>
                    <div><label className="text-xs text-text2 block mb-1">Chat ID</label>
                      <input className="input text-sm" value={config.chat_id || ''}
                        onChange={e => updateConfig(key, 'chat_id', e.target.value)}
                        placeholder="-1001234567890" /></div>
                  </>
                )}
                {key === 'signal' && (
                  <>
                    <div><label className="text-xs text-text2 block mb-1">API URL</label>
                      <input className="input text-sm" value={config.api_url || ''}
                        onChange={e => updateConfig(key, 'api_url', e.target.value)}
                        placeholder="http://localhost:8080/v1" /></div>
                    <div><label className="text-xs text-text2 block mb-1">Phone Number</label>
                      <input className="input text-sm" value={config.number || ''}
                        onChange={e => updateConfig(key, 'number', e.target.value)}
                        placeholder="+1234567890" /></div>
                  </>
                )}
                {key === 'sip' && (
                  <>
                    <div><label className="text-xs text-text2 block mb-1">Twilio Account SID</label>
                      <input className="input text-sm" value={config.twilio_sid || ''}
                        onChange={e => updateConfig(key, 'twilio_sid', e.target.value)}
                        placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" /></div>
                    <div><label className="text-xs text-text2 block mb-1">Auth Token</label>
                      <input className="input text-sm" type="password" value={config.twilio_token || ''}
                        onChange={e => updateConfig(key, 'twilio_token', e.target.value)}
                        placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" /></div>
                    <div><label className="text-xs text-text2 block mb-1">Phone Number</label>
                      <input className="input text-sm" value={config.phone_number || ''}
                        onChange={e => updateConfig(key, 'phone_number', e.target.value)}
                        placeholder="+1234567890" /></div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button onClick={() => testChannel(key)}
                  disabled={!enabled || status === 'sending'}
                  className={`btn text-sm flex items-center gap-1 py-1.5 ${!enabled ? 'btn-secondary opacity-50 cursor-not-allowed' : 'btn-secondary'}`}>
                  {status === 'sending' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Test
                </button>
                {status === 'success' && <span className="text-xs text-green flex items-center gap-1"><CheckCircle size={12} /> Sent!</span>}
                {status === 'error' && <span className="text-xs text-red flex items-center gap-1"><AlertCircle size={12} /> Failed</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
