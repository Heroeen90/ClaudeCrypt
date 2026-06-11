// ===== ClaudeCrypt — مولد المفاتيح المتقدم =====

'use strict';

const KeyGen = {

  // توليد مفتاح عشوائي قوي
  generateRandom(length) {
    return CryptoCore.generateRandomKey(length);
  },

  // توليد مفتاح من أصفار ريمان
  generateRiemann(length) {
    const seed = Date.now();
    return CryptoCore.generateRiemannKey(seed, length);
  },

  // توليد عبارة مرور (Passphrase)
  generatePassphrase() {
    const words = [
      'أزرق','أحمر','نجم','قمر','شمس','بحر','جبل','نهر','ليل','نور',
      'صحراء','غابة','سماء','أرض','ريح','مطر','برق','رعد','صخرة','موجة',
      'كتاب','قلم','باب','نافذة','طريق','مدينة','قرية','بيت','حديقة','نخلة',
      'أسد','نسر','حوت','فهد','طاووس','عقاب','ثعلب','ذئب','دلفين','صقر'
    ];
    const selected = [];
    const arr = new Uint8Array(4);
    for (let i = 0; i < 4; i++) {
      crypto.getRandomValues(arr);
      selected.push(words[arr[i] % words.length]);
    }
    const numArr = new Uint8Array(2);
    crypto.getRandomValues(numArr);
    return selected.join('-') + '-' + (numArr[0] % 900 + 100);
  },

  // توليد TOTP
  generateTOTP() {
    const secret = CryptoCore.generateRandomKey(16);
    const code = CryptoCore.generateTOTP(secret);
    return { secret, code, expiresIn: 30 - (Math.floor(Date.now() / 1000) % 30) };
  },

  // حساب قوة المفتاح التقنية
  getStrengthDetails(key) {
    const strength = CryptoCore.calculateKeyStrength(key);
    const bits = key.length * 6.5;
    const yearsToBreak = bits > 100 ? 'أكثر من عمر الكون' :
                         bits > 80 ? 'ملايين السنين' :
                         bits > 60 ? 'آلاف السنين' :
                         bits > 40 ? 'سنوات' : 'ساعات أو أيام';
    return {
      ...strength,
      bits: Math.round(bits),
      yearsToBreak,
      recommendations: this.getRecommendations(key)
    };
  },

  getRecommendations(key) {
    const recs = [];
    if (key.length < 16) recs.push('⚠️ زد الطول إلى 16 حرف على الأقل');
    if (!/[A-Z]/.test(key)) recs.push('⚠️ أضف أحرفاً كبيرة');
    if (!/[0-9]/.test(key)) recs.push('⚠️ أضف أرقاماً');
    if (!/[^A-Za-z0-9]/.test(key)) recs.push('⚠️ أضف رموزاً خاصة');
    if (recs.length === 0) recs.push('✅ المفتاح ممتاز');
    return recs;
  }
};

// --- حالة توليد المفاتيح ---
let gyroData = [];
let gyroCollecting = false;
let currentGeneratedKey = '';

// توليد المفتاح حسب النوع
async function generateKey() {
  const type = document.getElementById('keyType').value;
  const length = parseInt(document.getElementById('keyLength').value);
  let key = '';

  try {
    switch (type) {
      case 'random':
        key = KeyGen.generateRandom(length);
        break;
      case 'riemann':
        key = KeyGen.generateRiemann(length);
        break;
      case 'passphrase':
        key = KeyGen.generatePassphrase();
        break;
      case 'gyroscope':
        if (gyroData.length < 50) {
          startGyroscope();
          return showToast('حرك هاتفك لتوليد المفتاح!', '');
        }
        key = generateFromGyro(length);
        gyroData = [];
        gyroCollecting = false;
        break;
      case 'image':
        showToast('اختر صورة من الأسفل', '');
        document.getElementById('imageKeyArea').classList.remove('hidden');
        return;
      case 'time':
        const totp = KeyGen.generateTOTP();
        key = totp.code;
        document.getElementById('keyStrengthInfo').textContent =
          `🔑 المفتاح السري: ${totp.secret}\n⏰ ينتهي خلال: ${totp.expiresIn} ثانية`;
        break;
    }

    if (!key) return;
    displayKey(key);
  } catch (e) {
    showToast('خطأ: ' + e.message, 'error');
  }
}

function displayKey(key) {
  currentGeneratedKey = key;
  document.getElementById('keyOutput').textContent = key;
  const details = KeyGen.getStrengthDetails(key);
  document.getElementById('keyStrengthInfo').innerHTML = `
    <div>💪 القوة: ${details.label} (${details.score}%)</div>
    <div>🔢 الأمان التقريبي: ${details.bits} bit</div>
    <div>⏳ وقت الكسر المقدر: ${details.yearsToBreak}</div>
    <div style="margin-top:0.5rem">${details.recommendations.join('<br>')}</div>
  `;
  document.getElementById('keyResult').classList.remove('hidden');
  Stats.increment('keys');
  logActivity('⚡', `تم توليد مفتاح جديد (${key.length} حرف)`);
}

function copyKey() {
  if (!currentGeneratedKey) return;
  navigator.clipboard.writeText(currentGeneratedKey).then(() => {
    showToast('✅ تم نسخ المفتاح', 'success');
  });
}

function saveKeyToVault() {
  if (!currentGeneratedKey) return;
  const name = 'مفتاح مولد ' + new Date().toLocaleString('ar');
  Vault.save({ name, key: currentGeneratedKey, type: 'generated' });
  showToast('✅ تم حفظ المفتاح في الحافظة', 'success');
}

// الجيروسكوب
function startGyroscope() {
  if (!window.DeviceMotionEvent) {
    showToast('جهازك لا يدعم الجيروسكوب — جرب "عشوائي"', 'error');
    return;
  }
  gyroCollecting = true;
  gyroData = [];
  document.getElementById('gyroArea').classList.remove('hidden');

  if (typeof DeviceMotionEvent.requestPermission === 'function') {
    DeviceMotionEvent.requestPermission().then(perm => {
      if (perm === 'granted') listenGyro();
    });
  } else {
    listenGyro();
  }
}

function listenGyro() {
  const handler = (e) => {
    if (!gyroCollecting) return window.removeEventListener('devicemotion', handler);
    const acc = e.accelerationIncludingGravity;
    if (acc) {
      gyroData.push(acc.x || 0, acc.y || 0, acc.z || 0);
      const progress = Math.min(gyroData.length / 150, 1) * 100;
      document.getElementById('gyroFill').style.width = progress + '%';
      document.getElementById('gyroValue').textContent = `${Math.round(progress)}% مكتمل`;
      document.getElementById('gyroRing').style.borderColor =
        progress < 50 ? 'var(--accent-primary)' : 'var(--accent-green)';
      if (gyroData.length >= 150) {
        window.removeEventListener('devicemotion', handler);
        const key = generateFromGyro(32);
        displayKey(key);
        gyroData = [];
        showToast('✅ تم توليد المفتاح من حركتك!', 'success');
      }
    }
  };
  window.addEventListener('devicemotion', handler);
}

function generateFromGyro(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let key = '';
  for (let i = 0; i < length; i++) {
    const val = Math.abs(Math.round(gyroData[i % gyroData.length] * 1000));
    key += chars[val % chars.length];
  }
  return 'GY-' + key;
}

// مفتاح من صورة
function deriveKeyFromImage(input) {
  if (!input.files[0]) return;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.onload = async () => {
    canvas.width = Math.min(img.width, 200);
    canvas.height = Math.min(img.height, 200);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const key = await CryptoCore.deriveKeyFromImageData(imageData);
    displayKey('IMG-' + key);
    showToast('✅ تم اشتقاق المفتاح من الصورة!', 'success');
  };
  img.src = URL.createObjectURL(input.files[0]);
}

function updateKeyLength(val) {
  document.getElementById('keyLengthLabel').textContent = val;
  document.getElementById('keyType').dispatchEvent(new Event('change'));
}

// تحديث نوع مولد المفاتيح
document.addEventListener('DOMContentLoaded', () => {
  const keyTypeSelect = document.getElementById('keyType');
  if (keyTypeSelect) {
    keyTypeSelect.addEventListener('change', () => {
      const type = keyTypeSelect.value;
      document.getElementById('gyroArea').classList.toggle('hidden', type !== 'gyroscope');
      document.getElementById('imageKeyArea').classList.toggle('hidden', type !== 'image');
    });
  }
});

window.KeyGen = KeyGen;
