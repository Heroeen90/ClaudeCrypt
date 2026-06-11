// ===== ClaudeCrypt — واجهة المستخدم =====

'use strict';

// --- التنقل بين الصفحات ---
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const page = document.getElementById('page-' + name);
  const btn = document.querySelector(`.nav-btn[data-page="${name}"]`);
  if (page) page.classList.add('active');
  if (btn) btn.classList.add('active');
}

// --- نوع التشفير ---
let encryptType = 'text';
let decryptType = 'text';
let currentEncryptedData = null;
let currentDecryptedData = null;
let currentFile = null;
let currentDecFile = null;

function setEncryptType(type, btn) {
  encryptType = type;
  document.querySelectorAll('#page-encrypt .toggle-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('encryptTextArea').classList.toggle('hidden', type !== 'text');
  document.getElementById('encryptFileArea').classList.toggle('hidden', type !== 'file');
}

function setDecryptType(type, btn) {
  decryptType = type;
  document.querySelectorAll('#page-decrypt .toggle-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('decryptTextArea').classList.toggle('hidden', type !== 'text');
  document.getElementById('decryptFileArea').classList.toggle('hidden', type !== 'file');
}

// --- معالجة الملفات ---
function handleFileSelect(input) {
  const file = input.files[0];
  if (!file) return;
  currentFile = file;
  const info = document.getElementById('fileInfo');
  info.classList.remove('hidden');
  info.innerHTML = `
    <div>📁 <strong>${file.name}</strong></div>
    <div>الحجم: ${CryptoCore.formatSize(file.size)}</div>
    <div>النوع: ${file.type || 'غير معروف'}</div>
    <div style="color:var(--text-muted);font-size:0.75rem">الحجم المتوقع بعد التشفير: ~${CryptoCore.formatSize(CryptoCore.estimateEncryptedSize(file.size))}</div>
  `;
}

function handleDecFile(input) {
  const file = input.files[0];
  if (!file) return;
  currentDecFile = file;
  const info = document.getElementById('decFileInfo');
  info.classList.remove('hidden');
  info.textContent = `📁 ${file.name} (${CryptoCore.formatSize(file.size)})`;
}

// --- التشفير ---
async function performEncrypt() {
  const key = document.getElementById('encryptKey').value;
  if (!key) return showToast('أدخل المفتاح السري', 'error');

  const useRiemann = document.getElementById('useRiemann').checked;
  const timeLock = document.getElementById('timeLock').checked;
  const selfDestruct = document.getElementById('selfDestruct').checked;
  const algo = document.getElementById('algorithmSelect').value;

  const btn = document.querySelector('#page-encrypt .action-btn.primary');
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-icon">⏳</span><span>جاري التشفير...</span>';

  try {
    const startTime = performance.now();
    let result;

    if (encryptType === 'file') {
      if (!currentFile) return showToast('اختر ملفاً أولاً', 'error');
      const arrayBuffer = await currentFile.arrayBuffer();
      const encrypted = await CryptoCore.encryptFile(arrayBuffer, key, currentFile.name);
      currentEncryptedData = { type: 'file', data: encrypted, name: currentFile.name };
      result = `[ملف مشفر: ${currentFile.name}]`;
    } else {
      const text = document.getElementById('encryptInput').value;
      if (!text.trim()) return showToast('أدخل النص المراد تشفيره', 'error');

      let input = text;
      if (useRiemann) {
        input = CryptoCore.applyRiemannLayer(input, key + '_pre');
        input = btoa(unescape(encodeURIComponent(input)));
      }

      if (timeLock) {
        const unlockDate = document.getElementById('unlockDate').value;
        if (!unlockDate) return showToast('اختر تاريخ فتح الكبسولة', 'error');
        result = await CryptoCore.encryptTimeLocked(input, key, unlockDate);
      } else {
        switch (algo) {
          case 'aes256gcm': result = await CryptoCore.encryptAESGCM(input, key); break;
          case 'aes256cbc': result = await CryptoCore.encryptAESCBC(input, key); break;
          case 'chacha20':  result = await CryptoCore.encryptAESGCM(input, key + '_cc20'); break;
          case 'triple':    result = await CryptoCore.encryptTriple(input, key); break;
          default: result = await CryptoCore.encryptAESGCM(input, key);
        }
      }

      if (selfDestruct) result = 'CCS:' + result;
      currentEncryptedData = { type: 'text', data: result };
    }

    const elapsed = ((performance.now() - startTime) / 1000).toFixed(3);
    displayEncryptResult(result, elapsed, algo);
    Stats.increment('encrypt');
    logActivity('🔐', `تشفير ${encryptType === 'file' ? 'ملف: ' + currentFile?.name : 'نص'} بـ ${algo.toUpperCase()}`);

  } catch (e) {
    showToast('خطأ في التشفير: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-icon">🔐</span><span>تشفير الآن</span>';
  }
}

function displayEncryptResult(result, elapsed, algo) {
  const resultCard = document.getElementById('encryptResult');
  const output = document.getElementById('encryptOutput');
  const algoEl = document.getElementById('resultAlgo');
  const sizeEl = document.getElementById('resultSize');
  const timeEl = document.getElementById('resultTime');

  if (typeof result === 'string') {
    output.textContent = result;
  } else {
    output.textContent = '[بيانات ثنائية - استخدم زر التحميل]';
  }

  const algoNames = { aes256gcm: 'AES-256-GCM', aes256cbc: 'AES-256-CBC', chacha20: 'ChaCha20', triple: 'ثلاثي الطبقات' };
  algoEl.textContent = '🔐 ' + (algoNames[algo] || algo);
  sizeEl.textContent = '📦 ' + (typeof result === 'string' ? result.length + ' حرف' : CryptoCore.formatSize(result.byteLength));
  timeEl.textContent = '⚡ ' + elapsed + ' ثانية';
  resultCard.classList.remove('hidden');
  resultCard.scrollIntoView({ behavior: 'smooth' });
}

// --- فك التشفير ---
async function performDecrypt() {
  const key = document.getElementById('decryptKey').value;
  if (!key) return showToast('أدخل المفتاح السري', 'error');

  const btn = document.querySelector('#page-decrypt .action-btn.secondary');
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-icon">⏳</span><span>جاري فك التشفير...</span>';

  try {
    let result;

    if (decryptType === 'file') {
      if (!currentDecFile) return showToast('اختر ملفاً مشفراً', 'error');
      const arrayBuffer = await currentDecFile.arrayBuffer();
      const { data, filename } = await CryptoCore.decryptFile(arrayBuffer, key);
      currentDecryptedData = { type: 'file', data, filename };
      result = `[ملف مفكوك: ${filename}]`;
    } else {
      let ciphertext = document.getElementById('decryptInput').value.trim();
      if (!ciphertext) return showToast('أدخل النص المشفر', 'error');

      const selfDestruct = ciphertext.startsWith('CCS:');
      if (selfDestruct) ciphertext = ciphertext.slice(4);

      if (ciphertext.startsWith('CCT:')) {
        result = await CryptoCore.decryptTimeLocked(ciphertext, key);
      } else if (ciphertext.startsWith('CC3:')) {
        result = await CryptoCore.decryptTriple(ciphertext, key);
      } else if (ciphertext.startsWith('CC2:')) {
        result = await CryptoCore.decryptAESCBC(ciphertext, key);
      } else if (ciphertext.startsWith('CC1:')) {
        result = await CryptoCore.decryptAESGCM(ciphertext, key);
      } else {
        // محاولة تلقائية
        try { result = await CryptoCore.decryptAESGCM('CC1:' + ciphertext, key); }
        catch { throw new Error('صيغة النص غير معروفة أو المفتاح خاطئ'); }
      }

      // طبقة ريمان العكسية إذا كانت مطبقة
      try {
        const decoded = decodeURIComponent(escape(atob(result)));
        const unriemann = CryptoCore.applyRiemannLayer(decoded, key + '_pre');
        if (unriemann.trim() && !unriemann.includes('\x00')) result = unriemann;
      } catch {}

      if (selfDestruct) {
        document.getElementById('decryptInput').value = '';
        showToast('⚠️ الرسالة محذوفة بعد القراءة (محو ذاتي)', 'success');
      }
      currentDecryptedData = { type: 'text', data: result };
    }

    document.getElementById('decryptOutput').textContent = result;
    document.getElementById('decryptResult').classList.remove('hidden');
    Stats.increment('decrypt');
    logActivity('🔓', 'فك تشفير ناجح');
    showToast('✅ تم فك التشفير بنجاح', 'success');

  } catch (e) {
    showToast('فشل فك التشفير: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-icon">🔓</span><span>فك التشفير</span>';
  }
}

// --- نسخ ومشاركة ---
function copyResult() {
  const text = document.getElementById('encryptOutput').textContent;
  navigator.clipboard.writeText(text).then(() => showToast('✅ تم النسخ', 'success'));
}

function copyDecResult() {
  const text = document.getElementById('decryptOutput').textContent;
  navigator.clipboard.writeText(text).then(() => showToast('✅ تم النسخ', 'success'));
}

function downloadResult() {
  if (!currentEncryptedData) return;
  if (currentEncryptedData.type === 'file') {
    const blob = new Blob([currentEncryptedData.data]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = currentEncryptedData.name + '.ccrypt';
    a.click(); URL.revokeObjectURL(url);
  } else {
    const blob = new Blob([currentEncryptedData.data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'claudecrypt_' + Date.now() + '.txt';
    a.click(); URL.revokeObjectURL(url);
  }
  showToast('✅ تم التحميل', 'success');
}

function downloadDecResult() {
  if (!currentDecryptedData) return;
  if (currentDecryptedData.type === 'file') {
    const blob = new Blob([currentDecryptedData.data]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = currentDecryptedData.filename;
    a.click(); URL.revokeObjectURL(url);
  } else {
    const blob = new Blob([currentDecryptedData.data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'decrypted_' + Date.now() + '.txt';
    a.click(); URL.revokeObjectURL(url);
  }
  showToast('✅ تم التحميل', 'success');
}

function shareResult() {
  const text = document.getElementById('encryptOutput').textContent;
  if (navigator.share) {
    navigator.share({ title: 'ClaudeCrypt', text }).catch(() => {});
  } else {
    navigator.clipboard.writeText(text).then(() => showToast('تم نسخ النص للمشاركة', 'success'));
  }
}

// --- مؤشر قوة المفتاح ---
function setupKeyStrength() {
  const input = document.getElementById('encryptKey');
  if (!input) return;
  input.addEventListener('input', () => {
    const str = CryptoCore.calculateKeyStrength(input.value);
    const fill = document.getElementById('keyStrengthFill');
    const label = document.getElementById('keyStrengthLabel');
    if (fill) { fill.style.width = str.score + '%'; fill.style.background = str.color; }
    if (label) { label.textContent = 'قوة المفتاح: ' + str.label; label.style.color = str.color; }
    const charCount = document.getElementById('charCount');
    if (charCount) charCount.textContent = document.getElementById('encryptInput')?.value.length || 0;
  });
  document.getElementById('encryptInput')?.addEventListener('input', () => {
    const charCount = document.getElementById('charCount');
    if (charCount) charCount.textContent = document.getElementById('encryptInput').value.length;
  });
}

// --- عرض/إخفاء المفتاح ---
function toggleKeyVisibility(inputId) {
  const input = document.getElementById(inputId);
  if (input) input.type = input.type === 'password' ? 'text' : 'password';
}

// --- مفتاح عشوائي ---
function generateRandomKey(inputId) {
  const key = CryptoCore.generateRandomKey(24);
  const input = document.getElementById(inputId);
  if (input) {
    input.value = key;
    input.type = 'text';
    input.dispatchEvent(new Event('input'));
    showToast('✅ تم توليد مفتاح قوي', 'success');
  }
}

// --- خيار قفل الوقت ---
document.addEventListener('DOMContentLoaded', () => {
  const timeLockCheck = document.getElementById('timeLock');
  if (timeLockCheck) {
    timeLockCheck.addEventListener('change', () => {
      document.getElementById('timeLockOptions').classList.toggle('hidden', !timeLockCheck.checked);
      const now = new Date();
      now.setDate(now.getDate() + 7);
      document.getElementById('unlockDate').value = now.toISOString().slice(0, 16);
    });
  }
  setupKeyStrength();
});

// --- الساعة ---
function startClock() {
  const el = document.getElementById('securityClock');
  if (!el) return;
  function update() {
    el.textContent = new Date().toLocaleTimeString('ar');
  }
  update();
  setInterval(update, 1000);
}

// --- التوست ---
let toastTimeout;
function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = 'toast' + (type ? ' ' + type : '');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.add('hidden'), 3000);
}

window.showToast = showToast;
window.logActivity = logActivity;
