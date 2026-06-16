const BASE_URL = '/api';

async function request(method, path, body) {
  const url = `${BASE_URL}${path}`;
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(url, opts);
    const text = await res.text();
    if (!res.ok) {
      let msg;
      try { msg = JSON.parse(text); } catch { msg = text; }
      throw new Error(typeof msg === 'string' ? msg : msg.error || res.statusText);
    }
    try { return JSON.parse(text); } catch { return text; }
  } catch (err) {
    if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
      throw new Error('Backend offline');
    }
    throw err;
  }
}

export function apiGet(path) { return request('GET', path); }
export function apiPost(path, body) { return request('POST', path, body); }
export function apiPatch(path, body) { return request('PATCH', path, body); }
export function apiPut(path, body) { return request('PUT', path, body); }
export function apiDelete(path) { return request('DELETE', path); }
