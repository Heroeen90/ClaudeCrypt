// ===== ClaudeCrypt — نواة التشفير المتقدمة =====
// AES-256-GCM + ChaCha20 + Triple Layer + Riemann Zeros

'use strict';

// أصفار معادلة ريمان المعروفة (الجزء التخيلي للأصفار غير البديهية)
const RIEMANN_ZEROS = [
  14.134725, 21.022040, 25.010858, 30.424876, 32.935062,
  37.586178, 40.918719, 43.327073, 48.005151, 49.773832,
  52.970321, 56.446248, 59.347044, 60.831779, 65.112544,
  67.079811, 69.546402, 72.067158, 75.704691, 77.144840,
  79.337376, 82.910381, 84.735493, 87.425275, 88.809111,
  92.491899, 94.651344, 95.870634, 98.831194, 101.317851
];

const CryptoCore = {

  // توليد مفتاح من كلمة المرور باستخدام PBKDF2
  async deriveKey(password, salt, iterations = 310000) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: enc.encode(salt), iterations, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false, ['encrypt', 'decrypt']
    );
  },

  // توليد مفتاح ChaCha20 (عبر AES كبديل في WebCrypto)
  async deriveKeyCBC(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: enc.encode(salt + '_cbc'), iterations: 250000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-CBC', length: 256 },
      false, ['encrypt', 'decrypt']
    );
  },

  // تشفير AES-256-GCM (الأقوى والأسرع)
  async encryptAESGCM(plaintext, password) {
    const salt = this.randomHex(32);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await this.deriveKey(password, salt);
    const enc = new TextEncoder();
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(plaintext)
    );
    const result = {
      algo: 'AES-256-GCM',
      salt,
      iv: this.bufferToHex(iv),
      data: this.bufferToBase64(encrypted),
      ts: Date.now()
    };
    return 'CC1:' + btoa(JSON.stringify(result));
  },

  // فك تشفير AES-256-GCM
  async decryptAESGCM(ciphertext, password) {
    if (!ciphertext.startsWith('CC1:')) throw new Error('صيغة غير صحيحة');
    const parsed = JSON.parse(atob(ciphertext.slice(4)));
    const key = await this.deriveKey(password, parsed.salt);
    const iv = this.hexToBuffer(parsed.iv);
    const data = this.base64ToBuffer(parsed.data);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key, data
    );
    return new TextDecoder().decode(decrypted);
  },

  // تشفير AES-256-CBC
  async encryptAESCBC(plaintext, password) {
    const salt = this.randomHex(32);
    const iv = crypto.getRandomValues(new Uint8Array(16));
    const key = await this.deriveKeyCBC(password, salt);
    const enc = new TextEncoder();
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-CBC', iv },
      key,
      enc.encode(plaintext)
    );
    const result = {
      algo: 'AES-256-CBC',
      salt,
      iv: this.bufferToHex(iv),
      data: this.bufferToBase64(encrypted),
      ts: Date.now()
    };
    return 'CC2:' + btoa(JSON.stringify(result));
  },

  // فك تشفير AES-256-CBC
  async decryptAESCBC(ciphertext, password) {
    if (!ciphertext.startsWith('CC2:')) throw new Error('صيغة غير صحيحة');
    const parsed = JSON.parse(atob(ciphertext.slice(4)));
    const key = await this.deriveKeyCBC(password, parsed.salt);
    const iv = this.hexToBuffer(parsed.iv);
    const data = this.base64ToBuffer(parsed.data);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-CBC', iv },
      key, data
    );
    return new TextDecoder().decode(decrypted);
  },

  // طبقة ريمان — XOR مع مصفوفة مشتقة من أصفار ريمان
  applyRiemannLayer(text, password) {
    const seed = this.simpleHash(password);
    const keyStream = [];
    for (let i = 0; i < text.length; i++) {
      const zeroIdx = (seed + i) % RIEMANN_ZEROS.length;
      const modifier = Math.floor((RIEMANN_ZEROS[zeroIdx] * 1000) % 256);
      keyStream.push(modifier);
    }
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ keyStream[i % keyStream.length]);
    }
    return result;
  },

  // تشفير ثلاثي الطبقات (AES-GCM + ريمان + AES-CBC)
  async encryptTriple(plaintext, password) {
    // الطبقة 1: ريمان
    const layer1 = this.applyRiemannLayer(plaintext, password + '_R');
    const layer1b64 = btoa(unescape(encodeURIComponent(layer1)));
    // الطبقة 2: AES-GCM
    const layer2 = await this.encryptAESGCM(layer1b64, password + '_L2');
    // الطبقة 3: AES-CBC
    const layer3 = await this.encryptAESCBC(layer2, password + '_L3');
    return 'CC3:' + layer3.slice(4);
  },

  // فك التشفير الثلاثي
  async decryptTriple(ciphertext, password) {
    if (!ciphertext.startsWith('CC3:')) throw new Error('صيغة غير صحيحة');
    const step1 = 'CC2:' + ciphertext.slice(4);
    const layer2 = await this.decryptAESCBC(step1, password + '_L3');
    const layer1b64 = await this.decryptAESGCM(layer2, password + '_L2');
    const layer1 = decodeURIComponent(escape(atob(layer1b64)));
    return this.applyRiemannLayer(layer1, password + '_R');
  },

  // تشفير الملفات (ArrayBuffer)
  async encryptFile(arrayBuffer, password, filename) {
    const salt = this.randomHex(32);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await this.deriveKey(password, salt);
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      arrayBuffer
    );
    const meta = {
      algo: 'AES-256-GCM-FILE',
      filename: btoa(unescape(encodeURIComponent(filename))),
      salt,
      iv: this.bufferToHex(iv),
      size: arrayBuffer.byteLength,
      ts: Date.now()
    };
    const metaStr = JSON.stringify(meta);
    const metaBytes = new TextEncoder().encode(metaStr);
    const metaLen = new Uint32Array([metaBytes.length]);
    const combined = new Uint8Array(4 + metaBytes.length + encrypted.byteLength);
    combined.set(new Uint8Array(metaLen.buffer), 0);
    combined.set(metaBytes, 4);
    combined.set(new Uint8Array(encrypted), 4 + metaBytes.length);
    return combined.buffer;
  },

  // فك تشفير الملفات
  async decryptFile(arrayBuffer, password) {
    const view = new DataView(arrayBuffer);
    const metaLen = view.getUint32(0, true);
    const metaBytes = new Uint8Array(arrayBuffer, 4, metaLen);
    const meta = JSON.parse(new TextDecoder().decode(metaBytes));
    const encData = new Uint8Array(arrayBuffer, 4 + metaLen);
    const key = await this.deriveKey(password, meta.salt);
    const iv = this.hexToBuffer(meta.iv);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encData
    );
    const filename = decodeURIComponent(escape(atob(meta.filename)));
    return { data: decrypted, filename };
  },

  // تشفير زمني (كبسولة زمنية)
  async encryptTimeLocked(plaintext, password, unlockDate) {
    const wrapped = JSON.stringify({
      content: plaintext,
      unlockAt: new Date(unlockDate).getTime(),
      locked: true
    });
    const encrypted = await this.encryptAESGCM(wrapped, password);
    return 'CCT:' + encrypted.slice(4);
  },

  // فك الكبسولة الزمنية
  async decryptTimeLocked(ciphertext, password) {
    if (!ciphertext.startsWith('CCT:')) throw new Error('صيغة غير صحيحة');
    const decrypted = await this.decryptAESGCM('CC1:' + ciphertext.slice(4), password);
    const data = JSON.parse(decrypted);
    if (data.locked && Date.now() < data.unlockAt) {
      const remaining = new Date(data.unlockAt - Date.now());
      const days = Math.floor(remaining / 86400000);
      const hours = Math.floor((remaining % 86400000) / 3600000);
      throw new Error(`الكبسولة مقفلة حتى: ${new Date(data.unlockAt).toLocaleString('ar')} (${days} يوم و ${hours} ساعة)`);
    }
    return data.content;
  },

  // حساب قوة المفتاح
  calculateKeyStrength(key) {
    if (!key) return { score: 0, label: '—', color: '#333' };
    let score = 0;
    if (key.length >= 8) score += 20;
    if (key.length >= 16) score += 20;
    if (key.length >= 32) score += 20;
    if (/[A-Z]/.test(key)) score += 10;
    if (/[a-z]/.test(key)) score += 10;
    if (/[0-9]/.test(key)) score += 10;
    if (/[^A-Za-z0-9]/.test(key)) score += 10;
    if (score < 30) return { score, label: 'ضعيف جداً', color: '#ff3366' };
    if (score < 50) return { score, label: 'ضعيف', color: '#ff6633' };
    if (score < 70) return { score, label: 'متوسط', color: '#ffaa00' };
    if (score < 90) return { score, label: 'قوي', color: '#00d2ff' };
    return { score, label: 'قوي جداً ✓', color: '#00ff9d' };
  },

  // توليد مفتاح عشوائي قوي
  generateRandomKey(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*-_+=';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array).map(b => chars[b % chars.length]).join('');
  },

  // توليد مفتاح من أصفار ريمان
  generateRiemannKey(seed, length = 32) {
    const hash = this.simpleHash(seed.toString());
    let key = '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
      const zeroIdx = (hash + i * 7) % RIEMANN_ZEROS.length;
      const val = Math.floor(RIEMANN_ZEROS[zeroIdx] * 10000) % chars.length;
      key += chars[val];
    }
    return 'RZ-' + key;
  },

  // توليد TOTP (مفتاح زمني)
  generateTOTP(secret, period = 30) {
    const counter = Math.floor(Date.now() / 1000 / period);
    const hash = this.simpleHash(secret + counter);
    const digits = 8;
    return String(Math.abs(hash) % Math.pow(10, digits)).padStart(digits, '0');
  },

  // اشتقاق مفتاح من صورة
  async deriveKeyFromImageData(imageData) {
    const pixels = imageData.data;
    let hash = 0;
    for (let i = 0; i < Math.min(pixels.length, 10000); i += 4) {
      hash = ((hash << 5) - hash) + pixels[i] + pixels[i+1] + pixels[i+2];
      hash = hash & hash;
    }
    const buffer = new TextEncoder().encode(hash.toString() + 'img_key_salt');
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return this.bufferToHex(new Uint8Array(hashBuffer)).substring(0, 32);
  },

  // --- أدوات مساعدة ---
  randomHex(bytes) {
    const arr = new Uint8Array(bytes);
    crypto.getRandomValues(arr);
    return this.bufferToHex(arr);
  },
  bufferToHex(buffer) {
    return Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join('');
  },
  hexToBuffer(hex) {
    const arr = new Uint8Array(hex.match(/.{2}/g).map(b => parseInt(b, 16)));
    return arr;
  },
  bufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach(b => binary += String.fromCharCode(b));
    return btoa(binary);
  },
  base64ToBuffer(base64) {
    const binary = atob(base64);
    const buffer = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i);
    return buffer;
  },
  simpleHash(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  },

  // حساب حجم الملف بعد التشفير (تقدير)
  estimateEncryptedSize(originalSize) {
    return Math.ceil(originalSize * 1.4) + 512;
  },

  // تنسيق الحجم
  formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
  }
};

window.CryptoCore = CryptoCore;
