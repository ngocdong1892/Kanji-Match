// Config
let pageSize = 10;
let data = [];
let currentPage = 0;
let leftItems = []; // objects with id
let rightItems = []; // shuffled
let selections = {left:null,right:null};
let pairsMap = new Map(); // leftId -> rightId

// Helpers
function $(id){return document.getElementById(id)}

function setCompactMode(){
  try{
    if(pageSize === 10) document.body.classList.add('compact');
    else document.body.classList.remove('compact');
  }catch(e){/* ignore if DOM not ready */}
}

async function loadData(levelFile){
  try{
    if(!levelFile || levelFile === 'all'){
      const parts = ['n1','n2','n3','n4','n5'];
      let merged = [];
      for(const p of parts){
        try{
          const r = await fetch('data/' + p + '.json');
          if(r.ok){ const arr = await r.json(); merged = merged.concat(arr); }
        }catch(_){ /* ignore */ }
      }
      if(merged.length>0){ data = dedupeByKanji(merged); return; }
    }else{
      const resp = await fetch('data/' + levelFile + '.json');
      if(!resp.ok) throw new Error('no local json');
      data = await resp.json();
    }
  }catch(e){
    console.error('No level JSON files (data/n1.json..data/n5.json) could be loaded. Please add at least one level file in the project root under /data.');
    data = [];
  }
}

function dedupeByKanji(arr){
  const seen = new Set();
  const out = [];
  for(const it of arr){
    const k = (it && it.kanji) ? String(it.kanji).trim() : null;
    if(!k) continue;
    if(seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}

function paginate(){
  const start = currentPage * pageSize;
  const slice = data.slice(start, start + pageSize);
  leftItems = slice.map((d, i) => ({ ...d, _idx: start + i }));
  rightItems = shuffle(leftItems.map(x => ({ ...x })));
  renderLists();
  renderPairs();
  setCompactMode();
  fitListsToViewport();
  $('pageInfo').textContent = `Page ${currentPage + 1} / ${Math.max(1, Math.ceil(data.length / pageSize))}`;
}

function fitListsToViewport(){
  // Calculate available height for lists so the body doesn't scroll
  try{
    const header = document.querySelector('header');
    const main = document.querySelector('main');
    const controlsHeight = header ? header.getBoundingClientRect().height : 0;
    const footerGap = 24; // small margin
    const viewportH = window.innerHeight;
    const available = Math.max(120, viewportH - controlsHeight - footerGap - 160); // 160 for bottom panels and margins
    document.querySelectorAll('.list').forEach(el=>{
      el.style.maxHeight = available + 'px';
    });
  }catch(e){ /* ignore */ }
}

function renderLists(){
  const left = $('leftList'); left.innerHTML = '';
  const right = $('rightList'); right.innerHTML = '';
  for(const it of leftItems){
    const div = document.createElement('div');
    div.className = 'item kanji';
    div.dataset.id = it._idx;
    div.tabIndex = 0;
    div.innerHTML = `<div class="kanji-main">${it.kanji}  <span class="reading-text">(${it.reading})</span></div>`;
    const tooltipParts = [];
    if(it.reading) tooltipParts.push('Đọc: ' + it.reading);
    if(it.vn) tooltipParts.push(it.vn);
    if(tooltipParts.length) div.title = tooltipParts.join(' — ');
    if(pairsMap.has(it._idx)) div.classList.add('disabled');
    div.addEventListener('click', ()=> onSelectLeft(it._idx, div));
    left.appendChild(div);
  }

  for(const it of rightItems){
    const div = document.createElement('div');
    div.className = 'item';
    div.dataset.id = it._idx;
    div.tabIndex = 0;
    div.innerHTML = `<div class="meaning-text">${it.meaning || ''}</div>`;
    // if(it.reading) div.innerHTML += `<div class="subtext">(${it.reading})</div>`;
    if(it.vn) div.innerHTML += `<div class="subtextvn">${it.vn}</div>`;
    if([...pairsMap.values()].includes(it._idx)) div.classList.add('disabled');
    div.addEventListener('click', ()=> onSelectRight(it._idx, div));
    right.appendChild(div);
  }
}

function onSelectLeft(id, node){
  if(node.classList.contains('disabled')) return;
  clearSelection('left');
  node.classList.add('selected');
  selections.left = id;
  attemptPair();
}
function onSelectRight(id, node){
  if(node.classList.contains('disabled')) return;
  clearSelection('right');
  node.classList.add('selected');
  selections.right = id;
  attemptPair();
}
function clearSelection(side){
  const container = side === 'left' ? $('leftList') : $('rightList');
  container.querySelectorAll('.item.selected').forEach(n=>n.classList.remove('selected'));
  selections[side] = null;
}

function attemptPair(){
  if(selections.left==null || selections.right==null) return;
  const leftId = selections.left, rightId = selections.right;
  pairsMap.set(leftId, rightId);
  document.querySelectorAll(`#leftList .item[data-id='${leftId}']`).forEach(n=>{n.classList.add('disabled');n.classList.remove('selected')});
  document.querySelectorAll(`#rightList .item[data-id='${rightId}']`).forEach(n=>{n.classList.add('disabled');n.classList.remove('selected')});
  selections.left = selections.right = null;
  renderPairs();
  updateScore();
  const ok = leftId === rightId;
  if(ok){ playTone(880,0.08); burstConfetti(12); }
  else { playTone(220,0.12); }
}

function renderPairs(){
  const container = $('pairs'); container.innerHTML = '';
  for(const [l,r] of pairsMap.entries()){
    const leftVal = data[l]?.kanji || '?';
    const rightVal = data[r]?.meaning || '?';
    const div = document.createElement('div'); div.className='pair';
    div.innerHTML = `<div style="font-weight:700">${leftVal}</div><div style="flex:1">${rightVal}</div><div class='remove' title='remove'>✖</div>`;
    div.querySelector('.remove').addEventListener('click', ()=>{
      pairsMap.delete(l);
      document.querySelectorAll(`#leftList .item[data-id='${l}']`).forEach(n=>n.classList.remove('disabled'));
      document.querySelectorAll(`#rightList .item[data-id='${r}']`).forEach(n=>n.classList.remove('disabled'));
      renderLists(); renderPairs(); updateScore();
    });
    container.appendChild(div);
  }
}

function updateScore(){
  let correct=0; let total=0;
  for(const [l,r] of pairsMap.entries()){
    total++;
    if(l===r) correct++;
  }
  $('score').textContent = `${correct} / ${total}`;
}

function checkAll(){
  const container = $('pairs');
  container.innerHTML = '';
  let correct=0,total=0;
  for(const [l,r] of pairsMap.entries()){
    total++;
    const ok = l===r;
    const leftVal = data[l]?.kanji || '?';
    const rightVal = data[r]?.meaning || '?';
    const div = document.createElement('div'); div.className='pair';
    div.innerHTML = `<div style="font-weight:700">${leftVal}</div><div style="flex:1">${rightVal}</div><div style='margin-left:8px'>${ok?"✅":"❌"}</div>`;
    if(ok) div.querySelector('div').classList.add('result-correct');
    else div.querySelector('div').classList.add('result-wrong');
    container.appendChild(div);
    if(ok) correct++;
  }
  if(correct === total && total>0){ playTone(880,0.12); burstConfetti(24); }
  $('score').textContent = `${correct} / ${total}`;
}

function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// fallback DOM shuffle (keeps old behavior if source arrays not available)
function shuffleChildren(container) {
  if (!container) return;
  const children = Array.from(container.children);
  if (children.length <= 1) return;
  shuffleArray(children);
  children.forEach(ch => container.appendChild(ch));
}

// Replace existing shuffle handlers: ensure only one handler exists by cloning the button (removes old listeners)
(function installShuffleHandler(){
  const oldBtn = document.getElementById('shuffleBtn');
  if(!oldBtn) return;
  const btn = oldBtn.cloneNode(true);
  oldBtn.parentNode.replaceChild(btn, oldBtn);

  btn.addEventListener('click', () => {
    // shuffle source arrays if present (preferred)
    if (Array.isArray(leftItems)) leftItems = shuffle(leftItems);
    if (Array.isArray(rightItems)) rightItems = shuffle(rightItems);
    // re-render visible lists
    if (typeof renderLists === 'function') renderLists();
    else {
      const l = document.getElementById('leftList');
      const r = document.getElementById('rightList');
      if (l) shuffleChildren(l);
      if (r) shuffleChildren(r);
    }
    // clear existing pairs/selections and reset score
    if (pairsMap && typeof pairsMap.clear === 'function') pairsMap.clear();
    const pairsContainer = document.getElementById('pairs');
    if (pairsContainer) pairsContainer.innerHTML = '';
    const scoreEl = document.getElementById('score');
    if (scoreEl) scoreEl.textContent = '0 / 0';
    document.querySelectorAll('.item.selected').forEach(el => el.classList.remove('selected'));
    // re-layout
    if (typeof fitListsToViewport === 'function') fitListsToViewport();
  });
})();

// playful audio + confetti
function playTone(freq, duration=0.1){
  try{
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = freq; g.gain.value = 0.02;
    o.connect(g); g.connect(ctx.destination);
    o.start(); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    setTimeout(()=>{ o.stop(); ctx.close(); }, duration*1000 + 50);
  }catch(e){/* audio not available */}
}

function burstConfetti(n=12){
  const container = document.getElementById('confetti');
  for(let i=0;i<n;i++){
    const el = document.createElement('div'); el.className='confetti';
    el.textContent = ['🎉','✨','🍭','🎈','⭐'][Math.floor(Math.random()*5)];
    el.style.left = Math.random()*90 + '%';
    el.style.top = (50 + Math.random()*30) + '%';
    el.style.transform = `translateY(0) rotate(${Math.random()*360}deg)`;
    container.appendChild(el);
    setTimeout(()=> el.remove(), 1200 + Math.random()*600);
  }
}

// UI hooks
const levelSel = $('levelSel');
if (levelSel) {
  levelSel.addEventListener('change', async (e) => {
    const level = e.target.value || 'all';
    currentPage = 0;
    pairsMap.clear();
    await loadData(level);
    paginate();
    updateScore();
  });
}

$('prevBtn').addEventListener('click', () => {
  if (currentPage > 0) {
    currentPage--;
    pairsMap.clear();
    paginate();
    updateScore();
  }
});

$('nextBtn').addEventListener('click', () => {
  if ((currentPage + 1) * pageSize < data.length) {
    currentPage++;
    pairsMap.clear();
    paginate();
    updateScore();
  }
});

$('shuffleBtn').addEventListener('click', () => {
  rightItems = shuffle(rightItems);
  renderLists();
});

$('checkBtn').addEventListener('click', () => checkAll());

const pageSizeSel = $('pageSizeSel');
if (pageSizeSel) {
  pageSizeSel.addEventListener('change', (e) => {
    const v = Number(e.target.value) || 30;
    pageSize = v;
    currentPage = 0;
    pairsMap.clear();
    setCompactMode();
    paginate();
    updateScore();
  });
}

(async function(){
  const initialLevel = (document.getElementById('levelSel')||{}).value || 'all';
  await loadData(initialLevel);
  if(!Array.isArray(data) || data.length===0){
    data = [
      {kanji:'日',meaning:'day / sun'},{kanji:'月',meaning:'month / moon'},{kanji:'火',meaning:'fire'}
    ];
  }
  setCompactMode();
  paginate();
  fitListsToViewport();
})();

window.addEventListener('resize', ()=>{
  fitListsToViewport();
});

console.log('Note: if you see "runtime.lastError" in console, it usually comes from a browser extension, not this page.');
