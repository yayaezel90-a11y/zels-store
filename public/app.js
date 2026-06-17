const $ = (selector) => document.querySelector(selector);
const messagesEl = $('#messages');
const historyList = $('#historyList');
const form = $('#chatForm');
const input = $('#messageInput');
const modelSelect = $('#modelSelect');
const personaSelect = $('#personaSelect');
const healthStatus = $('#healthStatus');
const chatTitle = $('#chatTitle');
const promptShelf = $('#promptShelf');
const sidebar = $('#sidebar');
const loginModal = $('#loginModal');
const settingsModal = $('#settingsModal');
const goalModal = $('#goalModal');
const activePlan = $('#activePlan');
const temperatureRange = $('#temperatureRange');
const temperatureLabel = $('#temperatureLabel');
const themeSelect = $('#themeSelect');
const autoScrollBtn = $('#autoScrollBtn');
const fullscreenBtn = $('#fullscreenBtn');
const profileName = $('#profileName');
const profileInitial = $('#profileInitial');
const goalResult = $('#goalResult');

const plans = {
  free: { label: 'Free', models: ['flash-lite', 'balanced'] },
  pro: { label: 'Pro', models: ['flash-lite', 'balanced', 'creative-pro', 'code-pro', 'reasoning-pro'] },
  promax: { label: 'Pro Max', models: ['flash-lite', 'balanced', 'creative-pro', 'code-pro', 'reasoning-pro', 'promax'] }
};
const modelLabels = {
  'flash-lite': 'Flash Lite',
  balanced: 'Balanced',
  'creative-pro': 'Creative Pro',
  'code-pro': 'Code Pro',
  'reasoning-pro': 'Reasoning Pro',
  promax: 'Pro Max'
};
const toolPrompts = {
  summarize: 'Ringkas teks berikut menjadi poin penting, insight, dan action item:\n',
  code: 'Bertindak sebagai senior engineer. Bantu buat/debug kode berikut:\n',
  business: 'Buat strategi bisnis praktis, funnel, pricing, dan langkah eksekusi untuk:\n'
};

let state = JSON.parse(localStorage.getItem('alfarez-state') || 'null') || {
  activeId: crypto.randomUUID(),
  plan: 'free',
  theme: 'dark',
  profile: null,
  autoScroll: true,
  chats: []
};

function saveState(){ localStorage.setItem('alfarez-state', JSON.stringify(state)); }
function activeChat(){
  let chat = state.chats.find((item) => item.id === state.activeId);
  if (!chat) {
    chat = { id: state.activeId, title: 'Chat baru', messages: [], createdAt: Date.now() };
    state.chats.unshift(chat);
  }
  return chat;
}
function escapeHtml(text){ return String(text).replace(/[&<>'"]/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch])); }
function saveAndRender(){ saveState(); renderProfile(); renderModels(); renderHistory(); renderMessages(); }
function scrollToBottom(force = false){ if (force || state.autoScroll) messagesEl.scrollTop = messagesEl.scrollHeight; }
function renderProfile(){
  const name = state.profile?.name || 'Masuk';
  profileName.textContent = name;
  profileInitial.textContent = state.profile?.name ? state.profile.name[0].toUpperCase() : '?';
  activePlan.value = plans[state.plan].label;
  autoScrollBtn.textContent = state.autoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF';
  autoScrollBtn.classList.toggle('active', state.autoScroll);
  document.body.dataset.theme = state.theme || 'dark';
  themeSelect.value = state.theme || 'dark';
}
function renderModels(){
  const allowed = plans[state.plan].models;
  const previous = modelSelect.value;
  modelSelect.innerHTML = allowed.map((model) => `<option value="${model}">${modelLabels[model]}</option>`).join('');
  modelSelect.value = allowed.includes(previous) ? previous : allowed.at(-1);
}
function renderHistory(){
  historyList.innerHTML = state.chats.map((chat) => `<button class="history-item ${chat.id === state.activeId ? 'active' : ''}" data-chat="${chat.id}"><span>${escapeHtml(chat.title)}</span><small>${new Date(chat.createdAt).toLocaleDateString('id-ID')}</small></button>`).join('');
}
function renderMessages(){
  const chat = activeChat();
  chatTitle.textContent = chat.title;
  messagesEl.innerHTML = chat.messages.map((msg) => {
    const avatar = msg.role === 'user' ? (state.profile?.name?.[0] || 'U') : 'A';
    const meta = escapeHtml(msg.meta || (msg.role === 'user' ? 'Kamu' : 'Alfarez AI'));
    const body = msg.thinking ? '<span class="thinking"><i></i><i></i><i></i></span>' : `${escapeHtml(msg.content)}${msg.streaming ? '<b class="cursor"></b>' : ''}`;
    return `<article class="message ${msg.role}"><div class="avatar">${avatar}</div><div class="bubble"><span>${meta}</span><p>${body}</p></div></article>`;
  }).join('') || `<div class="welcome"><div class="welcome-logo">A</div><h1>Apa yang ingin kamu buat hari ini?</h1><p>Pilih model, buka riwayat chat di sidebar, atau gunakan GoalPilot untuk mengubah tujuan jadi rencana kerja.</p></div>`;
  scrollToBottom();
}
function addMessage(role, content, meta = ''){
  const chat = activeChat();
  chat.messages.push({ role, content, meta, at: Date.now() });
  if (role === 'user' && chat.title === 'Chat baru') chat.title = content.slice(0, 38) || 'Chat baru';
  saveAndRender();
}
function setTyping(){
  const chat = activeChat();
  const typing = { role: 'assistant', content: '', meta: 'Alfarez AI sedang mikir', at: Date.now(), thinking: true, streaming: false };
  chat.messages.push(typing);
  saveAndRender();
  return typing;
}
function typeAssistantResponse(target, fullText, meta){
  target.thinking = false;
  target.streaming = true;
  target.meta = meta || 'Alfarez AI';
  target.content = '';
  let index = 0;
  const step = Math.max(2, Math.ceil(fullText.length / 240));
  return new Promise((resolve) => {
    const timer = setInterval(() => {
      target.content += fullText.slice(index, index + step);
      index += step;
      renderMessages();
      if (index >= fullText.length) {
        clearInterval(timer);
        target.content = fullText;
        target.streaming = false;
        saveAndRender();
        resolve();
      }
    }, 12);
  });
}
async function sendMessage(message){
  addMessage('user', message, `${modelLabels[modelSelect.value]} • ${personaSelect.value}`);
  input.value = '';
  const typing = setTyping();
  const chat = activeChat();
  try {
    const response = await fetch('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ message, history: chat.messages.filter((msg) => !msg.typing), model: modelSelect.value, persona: personaSelect.value, plan: state.plan, temperature: Number(temperatureRange.value) / 100 }) });
    const data = await response.json();
    await typeAssistantResponse(typing, data.reply || data.error || 'Tidak ada jawaban.', data.model ? `${data.model} • ${data.plan}` : 'Alfarez AI');
  } catch (error) {
    await typeAssistantResponse(typing, 'Koneksi gagal. Cek deployment atau environment variable.', 'Error');
  }
  saveAndRender();
}
function newChat(){ state.activeId = crypto.randomUUID(); activeChat(); saveAndRender(); if (innerWidth < 860) sidebar.classList.remove('open'); }
function enhancePrompt(){
  const text = input.value.trim();
  input.value = text ? `Jawab secara rapi dan praktis. Konteks: ${text}\n\nFormat: ringkasan, langkah, contoh, risiko, checklist.` : 'Buat jawaban yang rapi dengan ringkasan, langkah konkret, contoh, dan checklist untuk: ';
  input.focus();
}
function renderGoalPlan(plan){
  goalResult.innerHTML = `<div class="goal-score">${plan.score}<small>skor</small></div><h3>${escapeHtml(plan.headline)}</h3><div class="task-grid">${plan.tasks.map((task) => `<label><input type="checkbox"> <b>${escapeHtml(task.title)}</b><span>${escapeHtml(task.detail)}</span></label>`).join('')}</div><button class="primary" id="sendGoalPrompt" type="button">Kirim ke chat</button>`;
  $('#sendGoalPrompt').onclick = () => { goalModal.close(); input.value = plan.nextPrompt; input.focus(); };
}
async function buildGoalPilot(event){
  event.preventDefault();
  goalResult.textContent = 'GoalPilot sedang membuat action board...';
  const response = await fetch('/api/goalpilot', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ goal: $('#goalInput').value, horizon: $('#horizonSelect').value }) });
  const data = await response.json();
  renderGoalPlan(data.plan);
}

$('#newChatBtn').onclick = newChat;
autoScrollBtn.onclick = () => { state.autoScroll = !state.autoScroll; saveAndRender(); if (state.autoScroll) scrollToBottom(true); };
fullscreenBtn.onclick = () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen?.(); else document.exitFullscreen?.(); };
$('#menuBtn').onclick = () => sidebar.classList.toggle('open');
$('#settingsBtn').onclick = () => settingsModal.showModal();
$('#loginBtn').onclick = () => loginModal.showModal();
$('#openGoalPilot').onclick = () => goalModal.showModal();
$('#upgradeBtn').onclick = () => { state.plan = state.plan === 'promax' ? 'free' : 'promax'; saveAndRender(); settingsModal.showModal(); };
$('#saveLoginBtn').onclick = () => { state.profile = { name: $('#loginName').value || 'User', email: $('#loginEmail').value || '' }; loginModal.close(); saveAndRender(); };
$('#clearAllBtn').onclick = () => { state.chats = []; state.activeId = crypto.randomUUID(); saveAndRender(); };
$('#enhanceBtn').onclick = enhancePrompt;
temperatureRange.oninput = () => temperatureLabel.textContent = `${temperatureRange.value}%`;
themeSelect.onchange = () => { state.theme = themeSelect.value; saveAndRender(); };
promptShelf.onclick = (event) => { if (event.target.tagName === 'BUTTON') sendMessage(event.target.textContent); };
historyList.onclick = (event) => { const item = event.target.closest('[data-chat]'); if (item) { state.activeId = item.dataset.chat; saveAndRender(); if (innerWidth < 860) sidebar.classList.remove('open'); } };
document.querySelectorAll('[data-tool]').forEach((button) => button.onclick = () => { input.value = toolPrompts[button.dataset.tool] || ''; input.focus(); });
document.querySelectorAll('[data-close]').forEach((button) => button.onclick = () => document.getElementById(button.dataset.close).close());
form.onsubmit = (event) => { event.preventDefault(); const message = input.value.trim(); if (message) sendMessage(message); };
input.oninput = () => { input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 180)}px`; };
input.onkeydown = (event) => { if(event.key === 'Enter' && !event.shiftKey){ event.preventDefault(); form.requestSubmit(); } };
$('#goalForm').onsubmit = buildGoalPilot;
$('#micBtn').onclick = () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return addMessage('assistant', 'Browser ini belum mendukung voice input. Coba Chrome/Edge terbaru.', 'Voice');
  const recognition = new SpeechRecognition(); recognition.lang = 'id-ID'; recognition.start(); recognition.onresult = (event) => { input.value = event.results[0][0].transcript; input.focus(); };
};
fetch('/api/health').then((response) => response.json()).then((data) => { healthStatus.textContent = data.online ? `Online • ${data.defaultModel}` : 'Demo mode • API key belum aktif'; }).catch(() => { healthStatus.textContent = 'Offline'; });
saveAndRender();
