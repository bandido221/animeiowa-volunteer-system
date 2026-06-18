// feedback.js — drop this in dashboards/
// Usage: <script type="module" src="../feedback.js" data-page="User Manager"></script>
// For admin/ subfolder pages: <script type="module" src="../../feedback.js" data-page="Reports"></script>

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://mjnphetnuiuxgsghzdoo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qbnBoZXRudWl1eGdzZ2h6ZG9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4OTA2OTMsImV4cCI6MjA4NzQ2NjY5M30.sB1i6dy5e7brQHRiCJ-0Kf2aIcIO1DkUR1O2RtkmRGc';
const EDGE_FN_URL = `${SUPABASE_URL}/functions/v1/send-feedback`;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const currentScript = document.currentScript || document.querySelector('script[data-page]');
const PAGE_NAME = currentScript?.getAttribute('data-page') || document.title || 'Unknown Page';

// --- Inject styles ---
const style = document.createElement('style');
style.textContent = `
  #fb-btn {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    background: linear-gradient(135deg, #9b4dff, #6a1fd6);
    color: #fff;
    border: none;
    border-radius: 999px;
    padding: 10px 18px;
    font-family: 'Rajdhani', sans-serif;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 1px;
    cursor: pointer;
    box-shadow: 0 4px 20px rgba(155,77,255,0.4);
    transition: transform 0.15s, box-shadow 0.15s;
  }
  #fb-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(155,77,255,0.6); }

  #fb-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(5,4,15,0.75);
    backdrop-filter: blur(4px);
    z-index: 10000;
    align-items: center;
    justify-content: center;
  }
  #fb-overlay.open { display: flex; }

  #fb-modal {
    background: #0d0820;
    border: 1px solid rgba(160,80,255,0.35);
    border-radius: 18px;
    padding: 24px 22px;
    width: 100%;
    max-width: 420px;
    margin: 16px;
    position: relative;
  }
  #fb-modal::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(200,100,255,0.7), rgba(100,200,255,0.5), transparent);
    border-radius: 18px 18px 0 0;
  }
  #fb-modal h3 {
    font-family: 'Orbitron', monospace;
    font-size: 15px;
    font-weight: 900;
    color: #fff;
    margin: 0 0 4px;
    letter-spacing: 1px;
  }
  #fb-page-label {
    font-size: 12px;
    color: rgba(200,160,255,0.55);
    margin: 0 0 16px;
    font-family: 'Rajdhani', sans-serif;
    letter-spacing: 0.5px;
  }
  #fb-modal label {
    display: block;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: rgba(200,160,255,0.6);
    margin-bottom: 5px;
    font-family: 'Rajdhani', sans-serif;
  }
  #fb-modal textarea {
    width: 100%;
    min-height: 110px;
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid rgba(160,80,255,0.3);
    background: #150d2e;
    color: #fff;
    font-size: 14px;
    font-family: 'Rajdhani', sans-serif;
    resize: vertical;
    outline: none;
    box-sizing: border-box;
    margin-bottom: 14px;
  }
  #fb-modal textarea:focus { border-color: #9b4dff; box-shadow: 0 0 0 3px rgba(155,77,255,0.15); }
  #fb-user-info {
    font-size: 13px;
    color: rgba(200,160,255,0.55);
    margin-bottom: 14px;
    font-family: 'Rajdhani', sans-serif;
  }
  #fb-actions { display: flex; gap: 10px; justify-content: flex-end; }
  #fb-cancel {
    background: rgba(160,80,255,0.08);
    color: rgba(200,160,255,0.7);
    border: 1px solid rgba(160,80,255,0.2);
    border-radius: 10px;
    padding: 9px 18px;
    font-family: 'Rajdhani', sans-serif;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
  }
  #fb-send {
    background: linear-gradient(135deg, #9b4dff, #6a1fd6);
    color: #fff;
    border: none;
    border-radius: 10px;
    padding: 9px 22px;
    font-family: 'Rajdhani', sans-serif;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    letter-spacing: 0.5px;
  }
  #fb-send:disabled { opacity: 0.5; cursor: not-allowed; }
  #fb-msg {
    font-size: 13px;
    min-height: 18px;
    margin-bottom: 10px;
    font-family: 'Rajdhani', sans-serif;
  }
  #fb-msg.ok { color: #00d4aa; }
  #fb-msg.error { color: #ff3c6e; }
`;
document.head.appendChild(style);

// --- Inject HTML ---
const overlay = document.createElement('div');
overlay.id = 'fb-overlay';
overlay.innerHTML = `
  <div id="fb-modal">
    <h3>Send Feedback</h3>
    <p id="fb-page-label">Page: ${PAGE_NAME}</p>
    <div id="fb-user-info">Loading user info…</div>
    <label for="fb-desc">Describe the issue, bug, or change request</label>
    <textarea id="fb-desc" placeholder="What did you find or what needs to change?"></textarea>
    <div id="fb-msg"></div>
    <div id="fb-actions">
      <button id="fb-cancel" type="button">Cancel</button>
      <button id="fb-send" type="button">Send</button>
    </div>
  </div>
`;
document.body.appendChild(overlay);

const btn = document.createElement('button');
btn.id = 'fb-btn';
btn.type = 'button';
btn.textContent = '⚑ Feedback';
document.body.appendChild(btn);

// --- Logic ---
let userName = '';
let userEmail = '';

async function loadUser() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    document.getElementById('fb-user-info').textContent = 'Not logged in';
    return;
  }
  userEmail = session.user.email || '';
  const { data } = await supabase
    .from('core_users')
    .select('first_name, last_name')
    .eq('auth_id', session.user.id)
    .single();
  if (data) {
    userName = `${data.first_name || ''} ${data.last_name || ''}`.trim();
  }
  document.getElementById('fb-user-info').textContent = `Submitting as: ${userName || userEmail}`;
}

btn.addEventListener('click', () => {
  overlay.classList.add('open');
  document.getElementById('fb-desc').value = '';
  document.getElementById('fb-msg').textContent = '';
  document.getElementById('fb-msg').className = 'fb-msg';
  loadUser();
});

document.getElementById('fb-cancel').addEventListener('click', () => {
  overlay.classList.remove('open');
});

overlay.addEventListener('click', (e) => {
  if (e.target === overlay) overlay.classList.remove('open');
});

document.getElementById('fb-send').addEventListener('click', async () => {
  const desc = document.getElementById('fb-desc').value.trim();
  const msgEl = document.getElementById('fb-msg');
  const sendBtn = document.getElementById('fb-send');

  if (!desc) {
    msgEl.className = 'fb-msg error';
    msgEl.textContent = 'Please describe the issue before sending.';
    return;
  }

  sendBtn.disabled = true;
  sendBtn.textContent = 'Sending…';
  msgEl.textContent = '';

  try {
    const res = await fetch(EDGE_FN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: PAGE_NAME, userName, userEmail, description: desc })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to send');

    msgEl.className = 'fb-msg ok';
    msgEl.textContent = 'Feedback sent! Thank you.';
    setTimeout(() => overlay.classList.remove('open'), 1800);
  } catch (e) {
    msgEl.className = 'fb-msg error';
    msgEl.textContent = e.message || 'Failed to send feedback.';
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = 'Send';
  }
});