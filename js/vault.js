// ===== ClaudeCrypt — الحافظة الآمنة والإحصاء =====

'use strict';

// ===== الحافظة الآمنة =====
const Vault = {

  STORAGE_KEY: 'cc_vault_v1',

  // حفظ في الحافظة
  save(item) {
    const vault = this.load();
    const entry = {
      id: Date.now(),
      name: item.name || 'بدون اسم',
      key: item.key,
      filename: item.filename || null,
      type: item.type || 'text',
      ts: Date.now()
    };
    vault.unshift(entry);
    if (vault.length > 100) vault.splice(100);
    this.persist(vault);
    this.render();
    return entry;
  },

  // تحميل الحافظة
  load() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  },

  // حفظ في localStorage
  persist(vault) {
    try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(vault)); }
    catch (e) { showToast('تعذر حفظ في الحافظة', 'error'); }
  },

  // حذف عنصر
  delete(id) {
    const vault = this.load().filter(i => i.id !== id);
    this.persist(vault);
    this.render();
  },

  // مسح الكل
  clear() {
    if (!confirm('هل تريد مسح كل الحافظة؟')) return;
    localStorage.removeItem(this.STORAGE_KEY);
    this.render();
    showToast('تم مسح الحافظة', 'success');
  },

  // نسخ مفتاح
  copyKey(id) {
    const item = this.load().find(i => i.id === id);
    if (!item) return;
    navigator.clipboard.writeText(item.key).then(() => {
      showToast('✅ تم نسخ المفتاح', 'success');
    });
  },

  // رسم الحافظة
  render() {
    const vault = this.load();
    const list = document.getElementById('vaultList');
    const empty = document.getElementById('vaultEmpty');
    if (!list) return;

    if (vault.length === 0) {
      list.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');
    list.innerHTML = vault.map(item => `
      <div class="vault-item">
        <div class="vault-item-name">${this.escapeHtml(item.name)}</div>
        ${item.filename ? `<div class="vault-item-time" style="color:var(--text-secondary);margin-bottom:0.25rem">📁 ${this.escapeHtml(item.filename)}</div>` : ''}
        <div class="vault-item-key">${this.escapeHtml(item.key)}</div>
        <div style="display:flex;gap:0.5rem;align-items:center;justify-content:space-between">
          <div class="vault-item-actions">
            <button class="result-btn" onclick="Vault.copyKey(${item.id})">نسخ المفتاح</button>
            <button class="result-btn" style="color:var(--accent-red);border-color:rgba(255,51,102,0.3)" onclick="Vault.delete(${item.id})">حذف</button>
          </div>
          <div class="vault-item-time">${new Date(item.ts).toLocaleString('ar')}</div>
        </div>
      </div>
    `).join('');
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(text || ''));
    return div.innerHTML;
  }
};

// ===== الإحصاء والنشاط =====
const Stats = {

  STORAGE_KEY: 'cc_stats_v1',

  defaults() {
    return { encrypt: 0, decrypt: 0, stego: 0, keys: 0, activity: [] };
  },

  load() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? { ...this.defaults(), ...JSON.parse(raw) } : this.defaults();
    } catch { return this.defaults(); }
  },

  save(stats) {
    try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stats)); }
    catch {}
  },

  increment(type) {
    const stats = this.load();
    stats[type] = (stats[type] || 0) + 1;
    this.save(stats);
    this.render();
  },

  addActivity(icon, text) {
    const stats = this.load();
    if (!stats.activity) stats.activity = [];
    stats.activity.unshift({ icon, text, ts: Date.now() });
    if (stats.activity.length > 50) stats.activity.splice(50);
    this.save(stats);
    this.renderActivity();
  },

  render() {
    const stats = this.load();
    const ids = ['statEncrypt', 'statDecrypt', 'statStego', 'statKeys'];
    const keys = ['encrypt', 'decrypt', 'stego', 'keys'];
    ids.forEach((id, i) => {
      const el = document.getElementById(id);
      if (el) el.textContent = stats[keys[i]] || 0;
    });

    // حساب درجة الأمان
    const total = (stats.encrypt || 0) + (stats.decrypt || 0) + (stats.stego || 0) + (stats.keys || 0);
    const score = Math.min(100, Math.round(total * 5));
    const circle = document.getElementById('scoreCircle');
    const scoreVal = document.getElementById('scoreValue');
    if (circle && scoreVal) {
      const circumference = 339.3;
      const offset = circumference - (score / 100) * circumference;
      circle.style.strokeDashoffset = offset;
      circle.style.stroke = score > 70 ? '#00ff9d' : score > 40 ? '#00d2ff' : '#ffd700';
      scoreVal.textContent = score + '%';
    }

    const tips = document.getElementById('scoreTips');
    if (tips) {
      const tipsList = [];
      if ((stats.encrypt || 0) === 0) tipsList.push('• قم بتشفير رسالة لرفع درجتك');
      if ((stats.stego || 0) === 0) tipsList.push('• جرب إخفاء رسالة في صورة');
      if ((stats.keys || 0) === 0) tipsList.push('• ولّد مفاتيح عشوائية قوية');
      if (tipsList.length === 0) tipsList.push('✅ أداؤك الأمني ممتاز!');
      tips.innerHTML = tipsList.join('<br>');
    }

    this.renderActivity();
  },

  renderActivity() {
    const stats = this.load();
    const log = document.getElementById('activityLog');
    if (!log) return;
    const activities = stats.activity || [];
    if (activities.length === 0) {
      log.innerHTML = '<div class="log-empty">لا يوجد نشاط بعد</div>';
      return;
    }
    log.innerHTML = activities.slice(0, 20).map(a => `
      <div class="log-item">
        <span class="log-icon">${a.icon}</span>
        <span class="log-text">${a.text}</span>
        <span class="log-time">${new Date(a.ts).toLocaleTimeString('ar')}</span>
      </div>
    `).join('');
  },

  clear() {
    if (!confirm('هل تريد مسح كل الإحصاءات؟')) return;
    localStorage.removeItem(this.STORAGE_KEY);
    this.render();
    showToast('تم مسح الإحصاءات', 'success');
  }
};

// وظائف عامة
function openVault() {
  Vault.render();
  document.getElementById('vaultModal').classList.remove('hidden');
}
function closeVault() { document.getElementById('vaultModal').classList.add('hidden'); }
function clearVault() { Vault.clear(); }
function clearStats() { Stats.clear(); }

function exportToVault() {
  const output = document.getElementById('encryptOutput').textContent;
  const key = document.getElementById('encryptKey').value;
  if (!output || !key) return showToast('لا يوجد شيء للحفظ', 'error');
  const name = 'تشفير ' + new Date().toLocaleString('ar');
  Vault.save({ name, key, type: 'encrypt' });
  showToast('✅ تم الحفظ في الحافظة', 'success');
}

function logActivity(icon, text) {
  Stats.addActivity(icon, text);
}

window.Vault = Vault;
window.Stats = Stats;
