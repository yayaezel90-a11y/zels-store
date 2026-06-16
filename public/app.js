const messagesEl = document.querySelector('#messages');
const form = document.querySelector('#chatForm');
const input = document.querySelector('#messageInput');
const clearBtn = document.querySelector('#clearBtn');
const exportBtn = document.querySelector('#exportBtn');
const healthStatus = document.querySelector('#healthStatus');
const quickPrompts = document.querySelector('#quickPrompts');
const modelSelect = document.querySelector('#modelSelect');
const personaSelect = document.querySelector('#personaSelect');
const temperatureRange = document.querySelector('#temperatureRange');
const temperatureLabel = document.querySelector('#temperatureLabel');
const activePlan = document.querySelector('#activePlan');
const enhanceBtn = document.querySelector('#enhanceBtn');
const micBtn = document.querySelector('#micBtn');
const checkoutModal = document.querySelector('#checkoutModal');
const closeModal = document.querySelector('#closeModal');
const simulatePayBtn = document.querySelector('#simulatePayBtn');
const modalTitle = document.querySelector('#modalTitle');
const toolGrid = document.querySelector('.tool-grid');
const goalForm = document.querySelector('#goalForm');
const goalInput = document.querySelector('#goalInput');
const horizonSelect = document.querySelector('#horizonSelect');
const goalResult = document.querySelector('#goalResult');

const plans = {
  free: { label: 'Free', models: ['flash-lite', 'balanced'] },
  pro: { label: 'Pro', models: ['flash-lite', 'balanced', 'creative-pro', 'code-pro', 'reasoning-pro'] },
  promax: { label: 'Pro Max', models: ['flash-lite', 'balanced', 'creative-pro', 'code-pro', 'reasoning-pro', 'promax'] }
};
const modelLabels = {
  'flash-lite': 'Flash Lite - cepat',
  balanced: 'Balanced - harian',
  'creative-pro': 'Creative Pro - konten',
  'code-pro': 'Code Pro - programming',
  'reasoning-pro': 'Reasoning Pro - analisis',
  promax: 'Pro Max - paling kuat'
};
const toolPrompts = {
  summarize: 'Ringkas teks berikut menjadi poin penting, insight utama, dan action item:\n',
  code: 'Bertindak sebagai senior software engineer. Bantu debug/buat kode berikut dengan penjelasan rapi:\n',
  email: 'Buat email profesional, singkat, sopan, dan meyakinkan untuk konteks berikut:\n',
  seo: 'Buat ide SEO lengkap: keyword, judul, meta description, outline, dan CTA untuk topik:\n',
  translate: 'Terjemahkan dan rapikan teks berikut ke bahasa Indonesia natural, lalu beri versi Inggrisnya:\n',
  brainstorm: 'Brainstorm 20 ide kreatif, pilih 5 terbaik, dan susun langkah eksekusi untuk:\n'
};

let history = JSON.parse(localStorage.getItem('alfarez-history') || '[]');
let currentPlan = localStorage.getItem('alfarez-plan') || 'free';

function saveHistory(){ localStorage.setItem('alfarez-history', JSON.stringify(history.slice(-40))); }
function setPlan(plan){
  currentPlan = plan;
  localStorage.setItem('alfarez-plan', plan);
  activePlan.value = plans[plan].label;
  document.querySelectorAll('.plan').forEach(card => card.classList.toggle('active', card.dataset.plan === plan));
  renderModels();
}
function renderModels(){
  const allowed = plans[currentPlan].models;
  modelSelect.innerHTML = allowed.map(model => `<option value="${model}">${modelLabels[model]}</option>`).join('');
  modelSelect.value = allowed.at(-1);
}
function addMessage(role, content, meta = ''){
  history.push({ role, content, meta, at: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) });
  saveHistory();
  renderMessages();
}
function renderMessages(){
  messagesEl.innerHTML = history.map(m => `<div class="msg ${m.role}">${m.meta ? `<span class="msg-meta">${escapeHtml(m.meta)} • ${m.at || ''}</span>` : ''}${escapeHtml(m.content)}</div>`).join('') || '<div class="msg assistant"><span class="msg-meta">Alfarez AI</span>Halo, saya Alfarez AI. Pilih model, persona, lalu kirim pertanyaan. Mau dibantu apa hari ini?</div>';
  messagesEl.scrollTop = messagesEl.scrollHeight;
}
function escapeHtml(text){ return String(text).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch])); }
function typingMessage(){
  const loading = { role: 'assistant', content: '<typing>', meta: 'Alfarez AI sedang berpikir', at: '' };
  history.push(loading);
  messagesEl.innerHTML += '<div class="msg assistant"><span class="msg-meta">Alfarez AI sedang berpikir</span><span class="typing"><i></i><i></i><i></i></span></div>';
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return loading;
}
async function sendMessage(message){
  addMessage('user', message, `${plans[currentPlan].label} • ${modelLabels[modelSelect.value]}`);
  input.value = '';
  const loading = typingMessage();
  try {
    const payload = { message, history: history.filter(m => m !== loading), model: modelSelect.value, persona: personaSelect.value, plan: currentPlan, temperature: Number(temperatureRange.value) / 100 };
    const response = await fetch('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    const data = await response.json();
    loading.content = data.reply || data.error || 'Tidak ada jawaban.';
    loading.meta = data.model ? `Alfarez AI • ${data.model} • ${data.plan || plans[currentPlan].label}` : 'Alfarez AI';
  } catch (error) {
    loading.content = 'Koneksi gagal. Pastikan server Alfarez AI sedang berjalan.';
    loading.meta = 'Error koneksi';
  }
  saveHistory(); renderMessages();
}
function enhancePrompt(){
  const text = input.value.trim();
  if (!text) return input.value = 'Buat jawaban yang terstruktur dengan: ringkasan, langkah-langkah, contoh konkret, risiko, dan rekomendasi terbaik untuk: ';
  input.value = `Tolong jawab secara mendalam dan praktis. Konteks: ${text}\n\nFormat jawaban: ringkasan singkat, analisis, langkah eksekusi, contoh, dan checklist akhir.`;
  input.focus();
}
function exportChat(){
  const blob = new Blob([history.map(m => `[${m.role.toUpperCase()}] ${m.content}`).join('\n\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: 'alfarez-ai-chat.txt' });
  a.click(); URL.revokeObjectURL(url);
}
function openUpgrade(plan){
  modalTitle.textContent = `Upgrade ke ${plans[plan].label}`;
  checkoutModal.showModal();
  simulatePayBtn.onclick = () => { setPlan(plan); checkoutModal.close(); addMessage('assistant', `Pembayaran simulasi berhasil. Paket ${plans[plan].label} aktif di browser ini.`, 'Billing'); };
}

function renderGoalPlan(plan){
  goalResult.innerHTML = `
    <div class="goal-score"><span>${plan.score}</span><small>Skor siap eksekusi</small></div>
    <h3>${escapeHtml(plan.headline)}</h3>
    <p class="goal-domain">Domain: ${escapeHtml(plan.domain)} • Target: ${escapeHtml(plan.horizon)}</p>
    <div class="kanban-mini">${plan.tasks.map(task => `<label><input type="checkbox"> <b>${escapeHtml(task.title)}</b><small>${escapeHtml(task.detail)} • ${task.minutes} menit</small></label>`).join('')}</div>
    <div class="goal-columns"><div><b>Risiko</b><ul>${plan.risks.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div><div><b>Metrik sukses</b><ul>${plan.metrics.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div></div>
    <button class="btn" id="sendGoalPrompt" type="button">Kirim prompt ini ke Chat AI</button>`;
  document.querySelector('#sendGoalPrompt').onclick = () => { input.value = plan.nextPrompt; document.querySelector('#chat').scrollIntoView({ behavior:'smooth' }); input.focus(); };
}
async function buildGoalPilot(event){
  event.preventDefault();
  goalResult.innerHTML = '<div class="empty-state"><span class="typing"><i></i><i></i><i></i></span><p>GoalPilot sedang menyusun board...</p></div>';
  const response = await fetch('/api/goalpilot', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ goal: goalInput.value, horizon: horizonSelect.value }) });
  const data = await response.json();
  if (!data.ok) throw new Error(data.error || 'GoalPilot gagal.');
  renderGoalPlan(data.plan);
}

form.addEventListener('submit', event => { event.preventDefault(); const message = input.value.trim(); if(message) sendMessage(message); });
goalForm.addEventListener('submit', event => buildGoalPilot(event).catch(error => { goalResult.innerHTML = `<div class="empty-state">⚠️ ${escapeHtml(error.message)}</div>`; }));
clearBtn.addEventListener('click', () => { history = []; saveHistory(); renderMessages(); });
exportBtn.addEventListener('click', exportChat);
enhanceBtn.addEventListener('click', enhancePrompt);
closeModal.addEventListener('click', () => checkoutModal.close());
temperatureRange.addEventListener('input', () => temperatureLabel.textContent = `${temperatureRange.value}%`);
quickPrompts.addEventListener('click', event => { if(event.target.tagName === 'BUTTON') sendMessage(event.target.textContent); });
toolGrid.addEventListener('click', event => { if(event.target.tagName === 'BUTTON') { input.value = toolPrompts[event.target.dataset.tool] || ''; input.focus(); } });
document.querySelectorAll('.choose-plan').forEach(button => button.addEventListener('click', event => { const plan = event.target.closest('.plan').dataset.plan; plan === 'free' ? setPlan('free') : openUpgrade(plan); }));
input.addEventListener('keydown', event => { if(event.key === 'Enter' && !event.shiftKey){ event.preventDefault(); form.requestSubmit(); } });
micBtn.addEventListener('click', () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return addMessage('assistant', 'Browser ini belum mendukung voice input. Coba Chrome/Edge terbaru.', 'Voice');
  const recognition = new SpeechRecognition(); recognition.lang = 'id-ID'; recognition.start(); micBtn.textContent = '🔴';
  recognition.onresult = event => { input.value = event.results[0][0].transcript; input.focus(); };
  recognition.onend = () => { micBtn.textContent = '🎙️'; };
});
fetch('/api/health').then(r => r.json()).then(data => { healthStatus.textContent = data.online ? `Online • ${data.defaultModel}` : 'Demo lokal • API key belum aktif'; }).catch(() => { healthStatus.textContent = 'Server tidak terhubung'; });
setPlan(currentPlan);
renderMessages();
