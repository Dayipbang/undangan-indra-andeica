'use strict';
/* ============================================================
   CONFIG
   ============================================================ */
const CONFIG = window.WEDDING_CONFIG;

/* ============================================================
   🔥 FIREBASE
   ============================================================ */
const firebaseConfig = window.FIREBASE_CONFIG || {};

let db = null;
const FB_READY = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && !String(firebaseConfig.apiKey).includes('ISI_'));
if (FB_READY) {
  try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    console.log('✅ Firebase aktif');
  } catch(e) {
    console.warn('❌ Firebase gagal init:', e);
    db = null;
  }
} else {
  console.log('ℹ️ Firebase belum di-set, pakai localStorage');
}

/* ---------- ID TAMU & NAMA ---------- */
function getTamuId() {
  let id = localStorage.getItem('hajatan_tamu_id');
  if (!id) {
    id = 'tamu_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    try { localStorage.setItem('hajatan_tamu_id', id); } catch(e){}
  }
  return id;
}
function getNamaTersimpan(){
  try { return localStorage.getItem('hajatan_nama') || ''; } catch(e){ return ''; }
}
function simpanNama(n){
  try { localStorage.setItem('hajatan_nama', n); } catch(e){}
}
const GUEST_NAME_URL = (function(){
  try { return new URLSearchParams(location.search).get('to'); } catch(e){ return null; }
})();
let GUEST_NAME = GUEST_NAME_URL || getNamaTersimpan() || '';

/* ---------- HELPERS ---------- */
const $ = id => document.getElementById(id);
let toastTimer;
function toast(msg){
  const t = $('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove('show'), 2200);
}
function nowTime(){
  const d = new Date();
  return String(d.getHours()).padStart(2,'0') + '.' + String(d.getMinutes()).padStart(2,'0');
}
function fmtDur(sec){ return String(Math.floor(sec/60)).padStart(2,'0') + ':' + String(sec%60).padStart(2,'0'); }
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* ---------- SUARA POP ---------- */
let actx = null;
function ensureAudio(){
  try{
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
  }catch(e){}
  return actx;
}
document.addEventListener('pointerdown', ensureAudio, { once:true });
function pop(){
  try{
    const c = ensureAudio(); if(!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(720, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(1250, c.currentTime + 0.07);
    g.gain.setValueAtTime(0.11, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.17);
    o.connect(g); g.connect(c.destination);
    o.start(); o.stop(c.currentTime + 0.18);
  }catch(e){}
}

/* ---------- NAVIGATION ---------- */
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  $(id).classList.add('active');
  closeMenu(); closeCtx();
}
function openOverlay(id){ closeMenu(); $(id).classList.add('active'); try{ history.pushState({overlay:id},'',location.href); }catch(e){} }
function closeOverlay(id){ $(id).classList.remove('active'); }
function openModal(id){ closeMenu(); const el=$(id); if(el) el.classList.add('active'); else console.warn('Modal tidak ditemukan:',id); }
function closeModal(id){ const el=$(id); if(el) el.classList.remove('active'); }
function openGroupInfo(){ closeMenu(); renderPeserta(); showScreen('screen-info'); }
function closeGroupInfo(){ showScreen('screen-chat'); }
function goLanding(){ showScreen('screen-landing'); }
document.querySelectorAll('.modal-backdrop').forEach(m=>{
  m.addEventListener('click', e=>{ if(e.target === m && m.id !== 'modal-join') m.classList.remove('active'); });
});

/* ---------- MENU ⋮ ---------- */
function toggleMenu(e){ e.stopPropagation(); closeCtx(); $('wa-menu').classList.toggle('active'); }
function closeMenu(){ $('wa-menu').classList.remove('active'); }
document.addEventListener('click', e=>{
  if (!e.target.closest('#wa-menu') && !e.target.closest('.head-ic')) closeMenu();
  if (!e.target.closest('#ctx-menu')) closeCtx();
});
function menuAction(act){
  closeMenu();
  switch(act){
    case 'info': openGroupInfo(); break;
    case 'search': openSearch(); break;
    case 'media': openOverlay('overlay-gallery'); break;
    case 'guestbook': renderGuestbook(); openModal('modal-guestbook'); break;
    case 'event': openModal('modal-event'); break;
    case 'gift': openModal('modal-gift'); break;
    case 'exit': toast('Gaboleh keluar, masih hajatan! 😄🍜'); break;
  }
}

/* ---------- SEARCH ---------- */
function openSearch(){
  $('search-bar').classList.add('active');
  $('search-input').value = ''; $('sb-count').textContent = '';
  doSearch('');
  setTimeout(()=> $('search-input').focus(), 60);
}
function closeSearch(){
  $('search-bar').classList.remove('active');
  document.querySelectorAll('.msg').forEach(m=>{
    m.classList.remove('hidden-by-search');
    const b = m.querySelector('.bubble');
    if (b) clearMarks(b);
  });
}
function clearMarks(b){
  b.querySelectorAll('mark').forEach(k=>{ k.replaceWith(document.createTextNode(k.textContent)); });
  b.normalize();
}
function doSearch(q){
  q = q.trim().toLowerCase();
  let count = 0;
  document.querySelectorAll('#chat-scroll .msg').forEach(m=>{
    const b = m.querySelector('.bubble');
    if (!b){ m.classList.remove('hidden-by-search'); return; }
    clearMarks(b);
    if (!q){ m.classList.remove('hidden-by-search'); return; }
    if (b.textContent.toLowerCase().includes(q)){
      count++;
      m.classList.remove('hidden-by-search');
      const walker = document.createTreeWalker(b, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(tn=>{
        const txt = tn.textContent, low = txt.toLowerCase();
        if (!low.includes(q)) return;
        const frag = document.createDocumentFragment();
        let i = 0, idx;
        while ((idx = low.indexOf(q, i)) !== -1){
          if (idx > i) frag.appendChild(document.createTextNode(txt.slice(i, idx)));
          const mk = document.createElement('mark');
          mk.textContent = txt.slice(idx, idx + q.length);
          frag.appendChild(mk);
          i = idx + q.length;
        }
        frag.appendChild(document.createTextNode(txt.slice(i)));
        tn.parentNode.replaceChild(frag, tn);
      });
    } else {
      m.classList.add('hidden-by-search');
    }
  });
  $('sb-count').textContent = q ? count + ' hasil' : '';
}
$('search-input').addEventListener('input', e=> doSearch(e.target.value));

/* ---------- CHAT ENGINE ---------- */
const scrollEl = $('chat-scroll');
function nearBottom(){ return scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight < 60; }
function scrollToBottom(force){
  scrollEl.scrollTop = scrollEl.scrollHeight;
  if (force){
    unread = 0;
    $('newmsg-pill').classList.remove('active');
    $('newmsg-count').textContent = '0';
  }
}
let unread = 0;
function notifyNew(){
  if (nearBottom()){ scrollEl.scrollTop = scrollEl.scrollHeight; }
  else {
    unread++;
    $('newmsg-count').textContent = unread;
    $('newmsg-pill').classList.add('active');
  }
}
scrollEl.addEventListener('scroll', ()=>{
  if (nearBottom()){
    unread = 0;
    $('newmsg-pill').classList.remove('active');
    $('newmsg-count').textContent = '0';
  }
});
function dateDiv(text){
  const el = document.createElement('div');
  el.className = 'date-div'; el.textContent = text;
  scrollEl.appendChild(el);
}
function sysMsg(text){
  const el = document.createElement('div');
  el.className = 'sys-msg'; el.textContent = text;
  scrollEl.appendChild(el);
}
function setStatus(txt, typing){
  const st = $('head-status');
  st.textContent = txt;
  st.classList.toggle('typing', !!typing);
}
function addMessage(opts){
  const wrap = document.createElement('div');
  wrap.className = 'msg' + (opts.me ? ' out' : ' in');
  const bubbleCls = 'bubble' + (opts.me ? ' tail-out' : ' tail-in');
  const quoteHtml = opts.quote ? `<span class="quote"><b>${esc(opts.quote.name)}</b><span>${esc(opts.quote.text)}</span></span>` : '';
  const bodyHtml = opts.html || esc(opts.text || '').replace(/\n/g,'<br>');
  const inner = `${quoteHtml}${bodyHtml}<span class="meta">${esc(opts.time || nowTime())}${opts.me ? '<span class="ticks">✓✓</span>' : ''}</span>`;
  wrap.innerHTML = opts.me
    ? `<div class="col"><div class="${bubbleCls}">${inner}</div></div>`
    : `<div class="avatar" style="background:${opts.avaBg}">${opts.avatar}</div>
       <div class="col"><div class="sender" style="color:${opts.color}">${esc(opts.name)}</div><div class="${bubbleCls}">${inner}</div></div>`;
  scrollEl.appendChild(wrap);
  if (!opts.silent){ pop(); notifyNew(); } else { scrollEl.scrollTop = scrollEl.scrollHeight; }
  if (opts.html && opts.html.indexOf('rsvp-poll') !== -1){
    setTimeout(updatePollUI, 50);
  }
  return wrap;
}
function showTyping(whoKey){
  const p = CONFIG[whoKey];
  const el = document.createElement('div');
  el.className = 'msg in typing'; el.id = 'typing-' + whoKey;
  el.innerHTML = `<div class="avatar" style="background:${p.avaBg}">${p.avatar}</div>
    <div class="col"><div class="sender" style="color:${p.color}">${esc(p.name)}</div>
    <div class="bubble"><span class="d"></span><span class="d"></span><span class="d"></span></div></div>`;
  scrollEl.appendChild(el);
  setStatus(p.name + ' typing…', true);
  scrollEl.scrollTop = scrollEl.scrollHeight;
}
function hideTyping(whoKey){
  const el = $('typing-' + whoKey);
  if (el) el.remove();
  setStatus('Indra, Ande Ica, kamu', false);
}

/* ---------- KARTU ---------- */
function eventCardHtml(){
  return `<div class="card">
    <div class="c-top"><span class="big">📅</span>
      <div><b>${CONFIG.eventDateText}</b><small>Save the date!</small></div></div>
    <div class="c-body">⏰ <b>${CONFIG.eventTime}</b><br>📍 ${CONFIG.eventPlace}</div>
    <button class="c-btn" onclick="openModal('modal-event')">📋 Lihat Detail &amp; Rundown Acara</button>
  </div>`;
}
function pollCardHtml(){
  return `<div class="poll" id="rsvp-poll">
    <div class="p-q">🙋 Konfirmasi kehadiran yuk!</div>
    <button class="p-opt" data-opt="h"><span class="radio"></span> Hadir, pasti! 🎉 <span class="p-count" data-c="h"></span></button>
    <button class="p-opt" data-opt="b"><span class="radio"></span> Berhalangan, doakan ya 🙏 <span class="p-count" data-c="b"></span></button>
    <button class="p-opt" data-opt="r"><span class="radio"></span> Masih ragu 🤔 <span class="p-count" data-c="r"></span></button>
    <div class="p-foot" data-foot>Memuat suara…</div>
  </div>`;
}
function mediaCardHtml(){
  return `<div class="card">
    <div class="c-top" style="background:linear-gradient(140deg,var(--teal-500),var(--teal-800));color:#fff">
      <span class="big">📸</span>
      <div><b>Media, Lokasi &amp; Hadiah</b><small>Semua yang kamu butuhin 💚</small></div>
    </div>
    <div class="c-body" style="padding:8px 10px;display:flex;flex-wrap:wrap">
      <button class="c-btn-grid" onclick="openOverlay('overlay-gallery')">🖼️ Galeri</button>
      <button class="c-btn-grid" onclick="openOverlay('overlay-location')">📍 Lokasi</button>
      <button class="c-btn-grid" onclick="openModal('modal-gift')">💳 Hadiah</button>
      <button class="c-btn-grid" onclick="window.open(CONFIG.mapsUrl,'_blank','noopener')">📍 Google Maps</button>
    </div>
  </div>`;
}
function dalilCardHtml(){
  return `<div class="card" style="border-color:#f59e0b">
    <div class="c-top" style="background:linear-gradient(140deg,#fbbf24,#b45309);color:#fff">
      <span class="big">🕌</span>
      <div><b>Dalil &amp; Doa Pernikahan</b><small>QS. Ar-Rum: 21</small></div>
    </div>
    <div class="c-body" style="font-style:italic;font-size:12.5px;line-height:1.75;background:#fffef8">
      "Dan di antara tanda-tanda (kebesaran)-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu cenderung dan merasa tenteram kepadanya, dan Dia menjadikan di antaramu rasa kasih dan sayang. Sungguh, pada yang demikian itu benar-benar terdapat tanda-tanda (kebesaran Allah) bagi kaum yang berpikir."
    </div>
    <div class="c-body" style="text-align:center;font-size:12px;color:var(--teal-800);padding-top:0">
      <b>بارك الله لكما وبارك عليكما وجمع بينكما في خير</b>
    </div>
  </div>`;
}

/* ---------- SCRIPT PENGUMUMAN (4 pesan) ---------- */
const SCRIPT = [
  { who:'wanita', text:'Assalamualaikum Wr. Wb. Hallo semua, apa kabar? 🥰\n\nKami punya kabar bahagia — kami akan MENIKAH! 💍✨\nSemoga kami diberi kelancaran, dan kalian semua diberi kesehatan untuk hadir di hari bahagia kami ya 🙏', t:1000 },
  { who:'pria',   html:eventCardHtml() + pollCardHtml(), t:1600 },
  { who:'wanita', html:mediaCardHtml(), t:1600 },
  { who:'ustad',  text:'Assalamualaikum warahmatullahi wabarakatuh.\n\nBarakallahu laka wa baraka \'alaika wa jama\'a bainakuma fii khairin.\n\nSemoga Allah memberkahi pernikahan Indra & Ande Ica, menjadikan keluarga yang sakinah, mawaddah, warahmah. Aamiin ya Rabbal \'alamin 🤲', t:1800, dalil:true }
];

/* ---------- JOIN FLOW ---------- */
let joined = false;

function handleJoinClick(){
  if (GUEST_NAME){
    startChat();
    return;
  }
  openModal('modal-join');
  setTimeout(()=> $('join-nama').focus(), 200);
}

function submitJoin(){
  const nama = ($('join-nama').value || '').trim();
  if (!nama){ toast('Isi nama dulu ya 🙏'); $('join-nama').focus(); return; }
  if (nama.length > 26) { toast('Nama maks 26 karakter'); return; }
  GUEST_NAME = nama;
  simpanNama(nama);
  closeModal('modal-join');
  startChat();
}
$('join-nama').addEventListener('keydown', e=>{ if (e.key === 'Enter') submitJoin(); });

function startChat(){
  showScreen('screen-chat');
  $('pin-bar').classList.add('active');
  stopBadge();

  $('ipt-nama').value = GUEST_NAME;
  recordJoin(GUEST_NAME);

  if (joined) return;
  joined = true;

  // Autoplay musik
  setTimeout(()=>{
    if (music.paused){
      const p = music.play();
      if (p) p.then(()=>{ const ui = acUI(); if (ui) ui.btn.textContent = '⏸'; }).catch(()=>{});
    }
  }, 400);

  setTimeout(()=>{
    dateDiv('HARI INI');
    if (GUEST_NAME) sysMsg('Anda diundang atas nama ' + GUEST_NAME + ' — silakan tinggalkan ucapan & doa 🙏');

    let delay = 400;
    let lastEnd = 400;
    SCRIPT.forEach(step=>{
      delay += step.t;
      lastEnd = delay + 1500;
      setTimeout(()=> showTyping(step.who), delay);
      setTimeout(()=>{
        hideTyping(step.who);
        const p = CONFIG[step.who];
        addMessage({
          whoKey: step.who,
          name: p.name, avatar: p.avatar, color: p.color, avaBg: p.avaBg,
          text: step.text || '',
          html: step.html || (step.dalil ? dalilCardHtml() : '')
        });
      }, delay + 1500);
    });

    setTimeout(()=>{
      if (db){
        listenWishes();
        listenRSVP();
        listenJoins();
      } else {
        SEED_WISHES.forEach(w => renderWish(w, { me:false, silent:true }));
        loadWishes().forEach(w => renderWish(w, { me:true, silent:true }));
        listenRSVP();
        loadJoinsLocal();
      }
    }, lastEnd + 500);
  }, 300);
}

/* ---------- CATAT JOIN ---------- */
async function recordJoin(name){
  if (!name) return;
  const tamuId = getTamuId();
  if (db){
    try {
      await db.collection('joins').doc(tamuId).set({
        name: name,
        tamuId: tamuId,
        joinedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch(e){ console.warn('Join record error:', e); }
  } else {
    try {
      const arr = JSON.parse(localStorage.getItem('hajatan_joins') || '[]');
      if (!arr.find(x => x.tamuId === tamuId)){
        arr.push({ name, tamuId, joinedAt: Date.now() });
        localStorage.setItem('hajatan_joins', JSON.stringify(arr));
      }
      loadJoinsLocal();
    } catch(e){}
  }
}

/* ---------- PESERTA (JOINS) ---------- */
let pesertaData = [];
function listenJoins(){
  if (!db) return;
  db.collection('joins').orderBy('joinedAt', 'asc').onSnapshot(snap=>{
    pesertaData = [];
    snap.forEach(doc => pesertaData.push(doc.data()));
    renderPeserta();
  }, err=>{ console.warn('Joins listen error:', err); });
}
function loadJoinsLocal(){
  try {
    pesertaData = JSON.parse(localStorage.getItem('hajatan_joins') || '[]');
  } catch(e){ pesertaData = []; }
  renderPeserta();
}
function renderPeserta(){
  const total = pesertaData.length + 2;
  $('peserta-label').textContent = total + ' peserta';
  const list = $('peserta-list');
  list.innerHTML = '';

  const adminA = document.createElement('div');
  adminA.className = 'member';
  adminA.innerHTML = `<div class="m-ava" style="background:linear-gradient(145deg,#0ea5e9,#0369a1)">🤵</div>
    <div class="mt"><b>Indra <span class="admin-tag">ADMIN</span></b><small>Mempelai pria</small></div>`;
  list.appendChild(adminA);

  const adminB = document.createElement('div');
  adminB.className = 'member';
  adminB.innerHTML = `<div class="m-ava" style="background:linear-gradient(145deg,#f472b6,#be185d)">👰</div>
    <div class="mt"><b>Ande Ica <span class="admin-tag">ADMIN</span></b><small>Mempelai wanita</small></div>
    <span class="online-dot"></span>`;
  list.appendChild(adminB);

  const tampil = pesertaData.slice(-8);
  tampil.forEach(p=>{
    const isMe = p.tamuId === getTamuId();
    const d = document.createElement('div');
    d.className = 'member';
    d.innerHTML = `<div class="m-ava" style="background:linear-gradient(145deg,#34d399,#047857)">${isMe ? '🙂' : '👤'}</div>
      <div class="mt"><b>${esc(p.name)}${isMe ? ' <span class="admin-tag">KAMU</span>' : ''}</b><small>Tamu undangan</small></div>
      ${isMe ? '<span class="online-dot"></span>' : ''}`;
    list.appendChild(d);
  });
  if (pesertaData.length > 8){
    const more = document.createElement('p');
    more.style.cssText = 'text-align:center;font-size:11.5px;color:var(--ink-soft);padding:8px';
    more.textContent = '+ ' + (pesertaData.length - 8) + ' peserta lainnya';
    list.appendChild(more);
  }
}

/* ---------- COUNTDOWN ---------- */
let countdownInterval = null;
function tickCountdown(){
  const target = new Date(CONFIG.eventDate).getTime();
  const el = $('cd-timer');
  if (isNaN(target)){ el.textContent = '⚠️'; return; }
  const now = Date.now();
  const diff = target - now;
  if (diff <= 0){
    const day = 24*3600*1000;
    el.textContent = (diff > -day) ? '🎉 HARI INI!' : 'Acara telah usai 💚';
    return;
  }
  const s = Math.floor(diff/1000);
  const d = Math.floor(s/86400);
  const h = Math.floor(s%86400/3600);
  const m = Math.floor(s%3600/60);
  const sec = s%60;
  el.textContent = d > 0 ? d + ' hari ' + h + ' jam' : [h, m, sec].map(n=>String(n).padStart(2,'0')).join(':');
}
countdownInterval = setInterval(tickCountdown, 1000);
tickCountdown();

/* ============================================================
   RSVP
   ============================================================ */
const RSVP_KEY = 'hajatan_rsvp_v6';
let rsvpCounts = { h:0, b:0, r:0 };
let myVote = null;

function loadRSVP(){ try { return JSON.parse(localStorage.getItem(RSVP_KEY)) || { mine:null }; } catch(e){ return { mine:null }; } }
function saveRSVP(v){ try { localStorage.setItem(RSVP_KEY, JSON.stringify(v)); } catch(e){} }

function updatePollUI(){
  const total = rsvpCounts.h + rsvpCounts.b + rsvpCounts.r;
  document.querySelectorAll('#rsvp-poll').forEach(p=>{
    p.querySelectorAll('.p-opt').forEach(btn=>{
      const opt = btn.dataset.opt;
      btn.classList.toggle('chosen', myVote === opt);
      const cnt = btn.querySelector('.p-count');
      if (cnt) cnt.textContent = (rsvpCounts[opt] || 0) + ' suara';
    });
    const foot = p.querySelector('[data-foot]');
    if (foot) foot.textContent = total + ' peserta terkonfirmasi';
  });
}

function listenRSVP(){
  if (db){
    const tamuId = getTamuId();
    db.collection('rsvp').onSnapshot(snap=>{
      const counts = { h:0, b:0, r:0 };
      let mine = null;
      snap.forEach(doc=>{
        const d = doc.data();
        if (counts[d.opt] !== undefined) counts[d.opt]++;
        if (doc.id === tamuId) mine = d.opt;
      });
      rsvpCounts = counts;
      myVote = mine;
      updatePollUI();
    }, err=>{ console.warn('RSVP listen error:', err); });
  } else {
    const st = loadRSVP();
    myVote = st.mine;
    rsvpCounts = { h:0, b:0, r:0 };
    if (st.mine) rsvpCounts[st.mine] = 1;
    updatePollUI();
  }
}

async function voteRSVP(opt){
  const label = { h:'Hadir, pasti! 🎉', b:'Berhalangan 🙏', r:'Masih ragu 🤔' }[opt];
  if (db){
    const ref = db.collection('rsvp').doc(getTamuId());
    try {
      const snap = await ref.get();
      if (snap.exists && snap.data().opt === opt){
        await ref.delete();
        toast('Pilihan dibatalkan');
      } else {
        await ref.set({
          opt, name: GUEST_NAME || 'Tamu',
          at: firebase.firestore.FieldValue.serverTimestamp()
        });
        toast('Konfirmasi terkirim: ' + label);
      }
    } catch(e){
      console.warn('RSVP error:', e);
      toast('Gagal kirim RSVP 🙏');
    }
    return;
  }
  const st = loadRSVP();
  st.mine = (st.mine === opt) ? null : opt;
  saveRSVP(st);
  myVote = st.mine;
  rsvpCounts = { h:0, b:0, r:0 };
  if (st.mine) rsvpCounts[st.mine] = 1;
  updatePollUI();
  toast(st.mine ? 'Konfirmasi terkirim: ' + label : 'Pilihan dibatalkan');
}

scrollEl.addEventListener('click', e=>{
  const opt = e.target.closest('.p-opt');
  if (opt){ voteRSVP(opt.dataset.opt); return; }
  const play = e.target.closest('.ac-play');
  if (play){ toggleMusic(play); return; }
});

/* ---------- MUSIK ---------- */
const music = new Audio();
let musicFallbackTried = false;
music.src = CONFIG.musicFile;
music.preload = 'auto';
music.loop = true;
music.volume = 0.65;
let musicWasPlayingBeforeCall = false;
function duckMusic(){ musicWasPlayingBeforeCall = !music.paused; if (musicWasPlayingBeforeCall) music.volume = 0.12; }
function restoreMusic(){ music.volume = 0.65; }
music.addEventListener('error', ()=>{
  if (!musicFallbackTried && CONFIG.musicFallback){
    musicFallbackTried = true;
    music.src = CONFIG.musicFallback;
    music.load();
  }
});
function acUI(){
  const card = document.querySelector('.audio-card');
  return card ? { btn:card.querySelector('.ac-play'), fill:card.querySelector('.ac-fill'), time:card.querySelector('.ac-time') } : null;
}
function toggleMusic(btn){
  const ui = acUI();
  if (music.paused){
    ensureAudio();
    const pr = music.play();
    if (pr) pr.then(()=>{ if(ui) ui.btn.textContent = '⏸'; }).catch(()=>{
      toast('Musik belum tersedia');
    });
  } else {
    music.pause();
    if (ui) ui.btn.textContent = '▶';
  }
}
music.addEventListener('timeupdate', ()=>{
  const ui = acUI(); if (!ui) return;
  const pct = music.duration ? (music.currentTime / music.duration * 100) : 0;
  ui.fill.style.width = pct + '%';
  ui.time.textContent = fmtDur(Math.floor(music.currentTime)) + ' / ' + (music.duration ? fmtDur(Math.floor(music.duration)) : '0:00');
});
music.addEventListener('ended', ()=>{ if (!music.loop){ const ui = acUI(); if (ui) ui.btn.textContent = '▶'; } });

/* ============================================================
   VIDEO CALL (REAL VIDEO)
   ============================================================ */
let vcSec = 0, vcCamOff = false, vcAudioMuted = false;
const state_video = { timer:null };

function openVideoCall(){
  duckMusic();
  openOverlay('overlay-video');
  startVideoCall();
}

function startVideoCall(){
  vcSec = 0; vcCamOff = false; vcAudioMuted = false;
  $('vc-timer').textContent = '00:00';
  $('vc-cam').classList.remove('off'); $('vc-cam').textContent = '📷';
  $('vc-mute').classList.remove('off'); $('vc-mute').textContent = '🎙️';

  const video = $('vc-video');
  const offline = $('vc-offline');

  video.style.opacity = '1';
  video.style.display = 'block';
  offline.style.display = 'none';

  // Reset & load video
  try { video.pause(); } catch(e){}
  video.src = CONFIG.videoCallFile;
  video.muted = false;
  video.currentTime = 0;
  video.load();

  // Handle error kalau file nggak ada
  video.onerror = ()=>{
    video.style.display = 'none';
    offline.style.display = 'flex';
  };

  // Coba autoplay dengan suara
  const playPromise = video.play();
  if (playPromise) {
    playPromise.then(()=>{
      // Sukses autoplay dengan audio
    }).catch(()=>{
      // Autoplay dengan audio diblokir → coba mute
      video.muted = true;
      vcAudioMuted = true;
      $('vc-mute').classList.add('off');
      $('vc-mute').textContent = '🔇';
      const p2 = video.play();
      if (p2) {
        p2.then(()=>{
          toast('Ketuk 🎙️ untuk mengaktifkan suara');
        }).catch(()=>{
          // Benar-benar gagal
          video.style.display = 'none';
          offline.style.display = 'flex';
        });
      }
    });
  }

  clearInterval(state_video.timer);
  state_video.timer = setInterval(()=>{
    vcSec++;
    $('vc-timer').textContent = fmtDur(vcSec);
  }, 1000);
}

function endVideoCall(){
  clearInterval(state_video.timer);
  restoreMusic();
  const video = $('vc-video');
  try { video.pause(); video.currentTime = 0; } catch(e){}
  if (vcSec > 0) toast('Panggilan video berakhir · ' + fmtDur(vcSec) + ' 📹');
  closeOverlay('overlay-video');
}

$('vc-mute').addEventListener('click', function(){
  const video = $('vc-video');
  vcAudioMuted = !vcAudioMuted;
  video.muted = vcAudioMuted;
  this.classList.toggle('off', vcAudioMuted);
  this.textContent = vcAudioMuted ? '🔇' : '🎙️';
  toast(vcAudioMuted ? 'Mikrofon dimatikan 🔇' : 'Mikrofon aktif 🎙️');
});

$('vc-cam').addEventListener('click', function(){
  const video = $('vc-video');
  vcCamOff = !vcCamOff;
  this.classList.toggle('off', vcCamOff);
  this.textContent = vcCamOff ? '🚫' : '📷';
  video.style.opacity = vcCamOff ? '0' : '1';
  toast(vcCamOff ? 'Kamera dimatikan 📵' : 'Kamera aktif 📷');
});

$('vc-flip').addEventListener('click', ()=> toast('Kamera diputar 🔄'));
$('vc-end').addEventListener('click', endVideoCall);

/* ============================================================
   VOICE CALL (REAL AUDIO)
   ============================================================ */
let vSec = 0, vAudioMuted = false, vSpeakerOn = true;
const state_voice = { timer:null };

function openVoiceCall(){
  duckMusic();
  openOverlay('overlay-voice');
  startVoiceCall();
}

function startVoiceCall(){
  vSec = 0; vAudioMuted = false; vSpeakerOn = true;
  $('voice-timer').textContent = '00:00';
  $('voice-status').textContent = '🔒 End-to-end encrypted · Memanggil…';
  $('voice-mute').classList.remove('off'); $('voice-mute').textContent = '🎙️';
  $('voice-speaker').classList.remove('off'); $('voice-speaker').textContent = '🔊';

  const audio = $('voice-audio');
  try { audio.pause(); } catch(e){}
  audio.src = CONFIG.voiceCallFile;
  audio.muted = false;
  audio.volume = 1;
  audio.currentTime = 0;
  audio.load();

  audio.onerror = ()=>{
    // Diam aja, voice wrap tetap muncul
    console.warn('Voice audio error');
  };

  const playPromise = audio.play();
  if (playPromise) {
    playPromise.catch(()=>{
      audio.muted = true;
      vAudioMuted = true;
      $('voice-mute').classList.add('off');
      $('voice-mute').textContent = '🔇';
      const p2 = audio.play();
      if (p2) p2.catch(()=>{});
    });
  }

  clearInterval(state_voice.timer);
  let ringing = true;
  state_voice.timer = setInterval(()=>{
    if (ringing){
      ringing = false;
      $('voice-status').textContent = '🔒 End-to-end encrypted · Tersambung';
      toast('Panggilan tersambung 📞');
    }
    vSec++;
    $('voice-timer').textContent = fmtDur(vSec);
  }, 1000);
}

function endVoiceCall(){
  clearInterval(state_voice.timer);
  restoreMusic();
  const audio = $('voice-audio');
  try { audio.pause(); audio.currentTime = 0; } catch(e){}
  if (vSec > 0) toast('Panggilan suara berakhir · ' + fmtDur(vSec) + ' 📞');
  closeOverlay('overlay-voice');
}

$('voice-mute').addEventListener('click', function(){
  const audio = $('voice-audio');
  vAudioMuted = !vAudioMuted;
  audio.muted = vAudioMuted;
  this.classList.toggle('off', vAudioMuted);
  this.textContent = vAudioMuted ? '🔇' : '🎙️';
  toast(vAudioMuted ? 'Mikrofon dimatikan 🔇' : 'Mikrofon aktif 🎙️');
});

$('voice-speaker').addEventListener('click', function(){
  const audio = $('voice-audio');
  vSpeakerOn = !vSpeakerOn;
  audio.volume = vSpeakerOn ? 1 : 0.35;
  this.classList.toggle('off', !vSpeakerOn);
  this.textContent = vSpeakerOn ? '🔊' : '🔈';
  toast(vSpeakerOn ? 'Speaker aktif 🔊' : 'Mode earpiece 🔈');
});

$('voice-end').addEventListener('click', endVoiceCall);

/* ---------- DOKUMEN ICS ---------- */
function downloadICS(){
  const ics = [
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//GrupHajatan//IndraAndeIca//ID','BEGIN:VEVENT',
    'UID:ujen-eras-2025@gruphajatan','DTSTAMP:20261016T000000Z',
    'DTSTART;TZID=Asia/Jakarta:20270315T070000',
    'SUMMARY:Akad Nikah & Resepsi Indra & Ande Ica 💍',
    'LOCATION:' + CONFIG.eventPlace,
    'DESCRIPTION:Undangan digital Grup Hajatan',
    'END:VEVENT','END:VCALENDAR'
  ].join('\r\n');
  const blob = new Blob([ics], { type:'text/calendar' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'Undangan-Indra-Ande-Ica.ics';
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 400);
  toast('Undangan tersimpan ke kalender 📅✅');
}

/* ---------- CONTEXT MENU ---------- */
let ctxTimer = null, ctxTarget = null;
function openCtx(bubble, x, y){
  const wrap = bubble.closest('.msg');
  if (!wrap) return;
  const nameEl = wrap.querySelector('.sender');
  const clone = bubble.cloneNode(true);
  clone.querySelectorAll('.meta').forEach(m=>m.remove());
  ctxTarget = { wrap, name: nameEl ? nameEl.textContent.trim() : 'Pesan', text: clone.textContent.trim().slice(0, 90) };
  const appRect = document.querySelector('.app').getBoundingClientRect();
  const menu = $('ctx-menu');
  menu.classList.add('active');
  const mw = menu.offsetWidth, mh = menu.offsetHeight;
  let left = x - appRect.left, top = y - appRect.top;
  if (left + mw > appRect.width - 8) left = appRect.width - mw - 8;
  if (top + mh > appRect.height - 8) top = y - appRect.top - mh;
  if (top < 8) top = 8;
  menu.style.left = left + 'px'; menu.style.top = top + 'px';
}
function closeCtx(){ $('ctx-menu').classList.remove('active'); }
scrollEl.addEventListener('pointerdown', e=>{
  const b = e.target.closest('.bubble');
  clearTimeout(ctxTimer);
  if (!b) return;
  const x = e.clientX, y = e.clientY;
  ctxTimer = setTimeout(()=> openCtx(b, x, y), 480);
});
['pointerup','pointercancel'].forEach(ev=> scrollEl.addEventListener(ev, ()=> clearTimeout(ctxTimer)));
scrollEl.addEventListener('pointermove', ()=> clearTimeout(ctxTimer));
scrollEl.addEventListener('contextmenu', e=>{
  const b = e.target.closest('.bubble');
  if (b){ e.preventDefault(); openCtx(b, e.clientX, e.clientY); }
});
function ctxReply(){
  if (!ctxTarget) return;
  replyTo = { name:ctxTarget.name, text:ctxTarget.text };
  $('rb-name').textContent = 'Membalas ' + replyTo.name;
  $('rb-text').textContent = replyTo.text;
  $('reply-bar').classList.add('active');
  closeCtx();
  $('chat-text').focus();
}
function ctxCopy(){
  if (!ctxTarget) return;
  const done = ()=> toast('Teks disalin 📋');
  if (navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(ctxTarget.text).then(done).catch(()=> toast('Gagal menyalin 🙏'));
  } else toast('Gagal menyalin 🙏');
  closeCtx();
}
function ctxDelete(){
  if (ctxTarget){ ctxTarget.wrap.remove(); toast('Pesan dihapus 🗑️'); }
  closeCtx();
}

/* ---------- REPLY ---------- */
let replyTo = null;
function cancelReply(){
  replyTo = null;
  $('reply-bar').classList.remove('active');
}

/* ============================================================
   UCAPAN — Firebase / localStorage
   ============================================================ */
const WISH_KEY = 'hajatan_wishes_v6';
function loadWishes(){ try { return JSON.parse(localStorage.getItem(WISH_KEY)) || []; } catch(e){ return []; } }
function saveWishLocal(w){
  const arr = loadWishes(); arr.push(w);
  try { localStorage.setItem(WISH_KEY, JSON.stringify(arr)); } catch(e){}
}
const SEED_WISHES = [
  { name:'Keluarga Besar Aki Mememet', text:'Barakallahu laka wa baraka alaika wa jamaa bainakuma fii khair. Selamat menempuh hidup baru, Indra & Ande Ica! 🎉🙏', time:'08.12' },
  { name:'Firdayani & Rizal', text:'Selamat ya kak Ande Ica & bang Indra! Semoga samawa, bahagia selalu 🤲💚', time:'08.26' },
  { name:'Opah & Opa', text:'Turut berbahagia untuk kalian berdua. Jadilah keluarga yang sakinah, mawaddah, warahmah ❤️', time:'08.41' }
];
const GUEST_COLORS = ['#be185d','#0369a1','#047857','#b45309','#6d28d9','#0f766e','#c026d3'];
const GUEST_BG = ['linear-gradient(145deg,#f472b6,#be185d)','linear-gradient(145deg,#0ea5e9,#0369a1)','linear-gradient(145deg,#34d399,#047857)','linear-gradient(145deg,#fbbf24,#b45309)','linear-gradient(145deg,#a78bfa,#6d28d9)','linear-gradient(145deg,#2dd4bf,#0f766e)','linear-gradient(145deg,#e879f9,#c026d3)'];
function guestStyle(name){
  const safe = String(name || '?');
  const i = Math.abs([...safe].reduce((a,c)=>a+c.charCodeAt(0), 0)) % GUEST_COLORS.length;
  return { color:GUEST_COLORS[i], avaBg:GUEST_BG[i] };
}
function renderWish(w, opts){
  opts = opts || {};
  const st = guestStyle(w.name);
  addMessage({
    name: w.name, avatar: '🙂', color: st.color, avaBg: st.avaBg,
    text: w.text, time: w.time,
    me: opts.me !== undefined ? opts.me : true,
    quote: w.quote || null,
    silent: !!opts.silent
  });
}
function listenWishes(){
  if (!db) return;
  const rendered = new Set();
  db.collection('wishes').orderBy('createdAt', 'asc').onSnapshot(snap=>{
    snap.docChanges().forEach(change=>{
      if (change.type === 'added' && !rendered.has(change.doc.id)){
        rendered.add(change.doc.id);
        const data = change.doc.data();
        const isMe = data.tamuId === getTamuId();
        renderWish(data, { me: isMe, silent: true });
      }
    });
  }, err=>{ console.warn('Wishes listen error:', err); });
}
async function sendWishToDB(w){
  if (db){
    try {
      await db.collection('wishes').add({
        name: w.name, text: w.text, time: w.time,
        quote: w.quote || null,
        tamuId: getTamuId(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return true;
    } catch(e){
      console.warn('Gagal kirim ke Firebase:', e);
    }
  }
  saveWishLocal(w);
  renderWish(w, { me:true, silent:false });
  return false;
}

/* ---------- BUKU TAMU ---------- */
async function renderGuestbook(){
  const list = $('guest-list');
  list.innerHTML = '<p style="text-align:center;padding:22px;color:#999;font-size:13px">Memuat…</p>';
  let all = [];
  if (db){
    try {
      const snap = await db.collection('wishes').orderBy('createdAt', 'asc').get();
      snap.forEach(doc => all.push(doc.data()));
    } catch(e){ console.warn(e); }
  } else {
    all = [...SEED_WISHES, ...loadWishes()];
  }
  list.innerHTML = '';
  if (all.length === 0){
    list.innerHTML = '<p style="text-align:center;padding:22px;color:#999;font-size:13px">Belum ada ucapan.<br>Jadilah yang pertama! 💚</p>';
  }
  all.forEach(w=>{
    const d = document.createElement('div');
    d.className = 'guest-item';
    d.innerHTML = `<b>${esc(w.name)} <small>${esc(w.time)}</small></b><p>${esc(w.text)}</p>` +
      (w.quote ? `<div class="gq">↩ Membalas ${esc(w.quote.name)}: "${esc(w.quote.text)}"</div>` : '');
    list.appendChild(d);
  });
  const label = { h:'Hadir 🎉', b:'Berhalangan 🙏', r:'Masih ragu 🤔' };
  $('guest-count').textContent = all.length + ' ucapan terkirim' + (myVote ? ' · RSVP kamu: ' + label[myVote] : '') + ' 💚';
}

/* ---------- KIRIM UCAPAN ---------- */
async function sendMessage(){
  const namaEl = $('ipt-nama');
  const textEl = $('chat-text');
  const nama = (namaEl.value || GUEST_NAME || '').trim();
  const text = (textEl.value || '').trim();
  if (!nama){ toast('Nama kamu belum terisi 🙏'); return; }
  if (!text){ textEl.focus(); return; }
  if (nama.length > 26){ toast('Nama maks 26 karakter'); return; }

  const w = { name: nama, text: text, time: nowTime(), quote: replyTo };
  textEl.value = '';
  cancelReply();
  toast('Mengirim ucapan…');
  const ok = await sendWishToDB(w);
  if (ok) toast('Pesan terkirim. Terima kasih, ' + nama + '! 💚');
}
$('btn-send').addEventListener('click', sendMessage);
$('chat-text').addEventListener('keydown', e=>{ if (e.key === 'Enter') sendMessage(); });
$('chat-text').addEventListener('focus', ()=>{ setTimeout(()=>{ scrollToBottom(true); $('chat-text').scrollIntoView({block:'nearest',behavior:'smooth'}); }, 250); });

/* ---------- EMOJI ---------- */
const EMOJIS = '😀 😁 😂 🤣 😊 😍 🥰 😘 😎 🤗 🤔 😴 😭 😅 🥳 🤩 😇 🙃 😉 🥺 😌 ✨ 💚 💍 🎉 🎊 🍜 🍰 🎶 🧋 🍢 🥘 💐 🙏 💕 💖 ❤️ 👍 👏 🎁 📅 📍 📖'.split(' ').filter(Boolean);
function buildEmojiPanel(){
  const p = $('emoji-panel');
  EMOJIS.forEach(e=>{
    const b = document.createElement('button');
    b.textContent = e;
    b.onclick = ()=>{ const i = $('chat-text'); i.value += e; i.focus(); };
    p.appendChild(b);
  });
}
$('btn-emoji').addEventListener('click', ()=> $('emoji-panel').classList.toggle('active'));
$('file-input').addEventListener('change', e=>{
  const f = e.target.files[0];
  if (!f) return;
  addMessage({ me:true, text:'📎 ' + f.name, time:nowTime() });
  toast('Lampiran terkirim 📎');
  e.target.value = '';
});

/* ---------- GALERI ---------- */
const GALLERY = [
  { src:'assets/images/gallery/foto-1.jpeg', cap:'Galeri Indra & Ande Ica 1' },
  { src:'assets/images/gallery/foto-2.jpeg', cap:'Galeri Indra & Ande Ica 2' },
  { src:'assets/images/gallery/foto-3.jpeg', cap:'Galeri Indra & Ande Ica 3' },
  { src:'assets/images/gallery/foto-4.jpeg', cap:'Galeri Indra & Ande Ica 4' },
  { src:'assets/images/gallery/foto-5.jpeg', cap:'Galeri Indra & Ande Ica 5' },
  { src:'assets/images/gallery/foto-6.jpeg', cap:'Galeri Indra & Ande Ica 6' }
];
function buildGallery(){
  const grid = $('gallery-grid');
  grid.innerHTML = '';
  GALLERY.forEach(g=>{
    const d = document.createElement('div');
    d.className = 'g-item';
    const img = document.createElement('img');
    img.src = g.src; img.alt = g.cap; img.loading = 'lazy';
    img.onerror = ()=>{ d.innerHTML = '<div style="font-size:34px;padding-top:30%">💑</div>'; };
    d.appendChild(img);
    d.onclick = ()=>{
      $('lb-img').src = g.src;
      $('lb-cap').textContent = g.cap;
      $('lightbox').classList.add('active');
    };
    grid.appendChild(d);
  });
  const mp = $('media-preview');
  mp.innerHTML = '';
  GALLERY.slice(0,3).forEach(g=>{
    const d = document.createElement('div');
    d.className = 'mp';
    d.innerHTML = `<img src="${g.src}" alt="${esc(g.cap)}" loading="lazy">`;
    d.onclick = ()=> openOverlay('overlay-gallery');
    mp.appendChild(d);
  });
  const more = document.createElement('div');
  more.className = 'mp more';
  more.textContent = '+' + (GALLERY.length + 1 - 3);
  more.onclick = ()=> openOverlay('overlay-gallery');
  mp.appendChild(more);
}
function closeLightbox(){ $('lightbox').classList.remove('active'); }

/* ---------- BADGE LANDING ---------- */
let badgeTimer = null;
function startBadge(){
  let n = 0;
  badgeTimer = setInterval(()=>{
    n++;
    const b = $('landing-badge');
    b.style.display = 'flex';
    b.textContent = n > 9 ? '9+' : n;
    if (n === 1) pop();
  }, 2200);
}
function stopBadge(){
  clearInterval(badgeTimer);
  $('landing-badge').style.display = 'none';
}

/* ---------- GIFT ---------- */
function giftTab(tab){
  $('tab-bri').classList.toggle('active', tab === 'bri');
  $('tab-dana').classList.toggle('active', tab === 'dana');
  $('pane-bri').classList.toggle('active', tab === 'bri');
  $('pane-dana').classList.toggle('active', tab === 'dana');
}
function copyRekening(){
  const done = ()=> toast('Nomor rekening berhasil disalin ✅');
  if (navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(CONFIG.bank.number).then(done).catch(()=> fallbackCopy(done));
  } else fallbackCopy(done);
}
function copyDana(){
  const done = () => toast('Nomor DANA berhasil disalin ✅');
  if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(CONFIG.ewallet.number).then(done).catch(() => fallbackCopyValue(CONFIG.ewallet.number, done));
  else fallbackCopyValue(CONFIG.ewallet.number, done);
}
function fallbackCopyValue(value, cb){
  const ta=document.createElement('textarea'); ta.value=value; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select();
  try{document.execCommand('copy'); cb();}catch(e){toast('Gagal menyalin 🙏');} document.body.removeChild(ta);
}
function fallbackCopy(cb){
  const ta = document.createElement('textarea');
  ta.value = CONFIG.bank.number;
  ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); cb(); } catch(e){ toast('Gagal menyalin 🙏'); }
  document.body.removeChild(ta);
}

/* ---------- CLEANUP ---------- */
window.addEventListener('beforeunload', ()=>{
  clearInterval(countdownInterval);
  clearInterval(state_video.timer);
  clearInterval(state_voice.timer);
  clearInterval(badgeTimer);
});

/* ---------- INIT ---------- */
buildEmojiPanel();
buildGallery();
$('ipt-nama').value = GUEST_NAME || '';
if (!GUEST_NAME) $('chat-text').placeholder = 'Tulis ucapan & doa…';
startBadge();
