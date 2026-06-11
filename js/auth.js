// ===== ClaudeCrypt — نظام المصادقة =====

'use strict';

const Auth = {

  STORAGE_KEY: 'cc_auth_v1',
  pinBuffer: '',
  isSetup: false,
  usePIN: false,

  // تحميل بيانات المصادقة
  loadAuth() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },

  // حفظ بيانات المصادقة
  saveAuth(data) {
    try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data)); }
    catch (e) { showToast('تعذر حفظ بيانات الدخول', 'error'); }
  },

  // تهيئة شاشة القفل
  async init() {
    const authData = this.loadAuth();
    this.isSetup = !!authData;

    if (!authData) {
      // أول تشغيل — إعداد
      document.getElementById('lockMessage').textContent = 'مرحباً بك في ClaudeCrypt — أعد بصمتك للبدء';
      document.getElementById('biometricLabel').textContent = 'إعداد البصمة الآن';
    } else if (authData.method === 'pin') {
      document.getElementById('lockMessage').textContent = 'أدخل رمز الدخول للمتابعة';
      document.getElementById('biometricBtn').classList.add('hidden');
      document.getElementById('pinFallback').classList.remove('hidden');
      document.getElementById('usePinBtn').classList.add('hidden');
    } else {
      document.getElementById('lockMessage').textContent = 'مرحباً — اضغط للدخول ببصمتك';
      document.getElementById('biometricLabel').textContent = 'دخول ببصمة الإصبع';
    }

    // بدء الجسيمات
    initParticles();
  },

  // مصادقة بالبصمة
  async authenticateBiometric() {
    const authData = this.loadAuth();
    const btn = document.getElementById('biometricBtn');
    btn.disabled = true;

    try {
      if (!window.PublicKeyCredential) {
        throw new Error('WebAuthn غير مدعوم');
      }

      if (!authData || authData.method !== 'webauthn') {
        // تسجيل جديد
        await this.registerBiometric();
      } else {
        // تحقق
        await this.verifyBiometric(authData);
      }
    } catch (e) {
      console.log('Biometric error:', e.message);
      // fallback إلى PIN
      document.getElementById('lockMessage').textContent =
        'البصمة غير متاحة على هذا الجهاز — استخدم رمز الدخول';
      document.getElementById('biometricBtn').classList.add('hidden');
      document.getElementById('pinFallback').classList.remove('hidden');
      document.getElementById('usePinBtn').classList.add('hidden');
    } finally {
      btn.disabled = false;
    }
  },

  // تسجيل البصمة (WebAuthn)
  async registerBiometric() {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    const userId = new Uint8Array(16);
    crypto.getRandomValues(userId);

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'ClaudeCrypt', id: location.hostname || 'localhost' },
        user: { id: userId, name: 'user@claudecrypt', displayName: 'مستخدم ClaudeCrypt' },
        pubKeyCredParams: [{ alg: -7, type: 'public-key' }, { alg: -257, type: 'public-key' }],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required'
        },
        timeout: 60000
      }
    });

    const credId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
    this.saveAuth({ method: 'webauthn', credId });
    this.unlockApp();
  },

  // التحقق من البصمة
  async verifyBiometric(authData) {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const credIdBytes = Uint8Array.from(atob(authData.credId), c => c.charCodeAt(0));

    await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ id: credIdBytes, type: 'public-key' }],
        userVerification: 'required',
        timeout: 60000
      }
    });

    this.unlockApp();
  },

  // إعداد أو تحقق من PIN
  async handlePIN(pin) {
    const authData = this.loadAuth();

    if (!authData || authData.method === 'webauthn') {
      // إعداد PIN جديد
      const salt = CryptoCore.randomHex(16);
      const hash = await this.hashPIN(pin, salt);
      this.saveAuth({ method: 'pin', hash, salt });
      document.getElementById('lockMessage').textContent = '✅ تم حفظ الرمز — أدخله مرة أخرى للتأكيد';
      // طلب إعادة الإدخال
      localStorage.setItem('cc_pin_confirm', JSON.stringify({ hash, salt }));
      return;
    }

    // تأكيد PIN عند الإعداد
    const confirmData = JSON.parse(localStorage.getItem('cc_pin_confirm') || 'null');
    if (confirmData) {
      const hash = await this.hashPIN(pin, confirmData.salt);
      if (hash !== confirmData.hash) {
        showToast('الرمز غير متطابق — حاول مجدداً', 'error');
        localStorage.removeItem('cc_pin_confirm');
        this.saveAuth(null);
        return;
      }
      localStorage.removeItem('cc_pin_confirm');
      showToast('✅ تم إعداد الرمز', 'success');
      this.unlockApp();
      return;
    }

    // تحقق عادي
    const hash = await this.hashPIN(pin, authData.salt);
    if (hash === authData.hash) {
      this.unlockApp();
    } else {
      showToast('❌ رمز خاطئ', 'error');
      document.querySelectorAll('.pin-dot').forEach(d => {
        d.classList.add('filled');
        d.style.background = 'var(--accent-red)';
        setTimeout(() => { d.classList.remove('filled'); d.style.background = ''; }, 500);
      });
    }
  },

  // hash للـ PIN
  async hashPIN(pin, salt) {
    const data = new TextEncoder().encode(pin + salt + 'cc_salt_2024');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return CryptoCore.bufferToHex(new Uint8Array(hashBuffer));
  },

  // فتح التطبيق
  unlockApp() {
    const lockScreen = document.getElementById('lockScreen');
    const app = document.getElementById('app');
    lockScreen.style.opacity = '0';
    lockScreen.style.transform = 'scale(1.05)';
    setTimeout(() => {
      lockScreen.classList.add('hidden');
      app.classList.remove('hidden');
      app.style.opacity = '0';
      setTimeout(() => {
        app.style.opacity = '1';
        app.style.transition = 'opacity 0.3s ease';
      }, 50);
    }, 400);
    Stats.render();
    startClock();
  },

  // قفل التطبيق
  lock() {
    const app = document.getElementById('app');
    const lockScreen = document.getElementById('lockScreen');
    app.classList.add('hidden');
    lockScreen.style.opacity = '1';
    lockScreen.style.transform = 'scale(1)';
    lockScreen.style.transition = 'opacity 0.3s ease';
    lockScreen.classList.remove('hidden');
    this.pinBuffer = '';
    document.querySelectorAll('.pin-dot').forEach(d => d.classList.remove('filled'));
  }
};

// --- وظائف PIN ---
function pinInput(digit) {
  if (Auth.pinBuffer.length >= 6) return;
  Auth.pinBuffer += digit;
  const dots = document.querySelectorAll('.pin-dot');
  dots[Auth.pinBuffer.length - 1].classList.add('filled');

  if (Auth.pinBuffer.length === 6) {
    const pin = Auth.pinBuffer;
    Auth.pinBuffer = '';
    setTimeout(() => {
      document.querySelectorAll('.pin-dot').forEach(d => d.classList.remove('filled'));
      Auth.handlePIN(pin);
    }, 300);
  }
}

function pinClear() {
  Auth.pinBuffer = '';
  document.querySelectorAll('.pin-dot').forEach(d => d.classList.remove('filled'));
}

function pinBackspace() {
  if (Auth.pinBuffer.length === 0) return;
  Auth.pinBuffer = Auth.pinBuffer.slice(0, -1);
  document.querySelectorAll('.pin-dot')[Auth.pinBuffer.length].classList.remove('filled');
}

function togglePinMode() {
  const pinFallback = document.getElementById('pinFallback');
  const biometricBtn = document.getElementById('biometricBtn');
  const isPinVisible = !pinFallback.classList.contains('hidden');
  pinFallback.classList.toggle('hidden', isPinVisible);
  biometricBtn.classList.toggle('hidden', !isPinVisible);
  document.getElementById('usePinBtn').textContent =
    isPinVisible ? 'استخدام الرمز بدلاً من البصمة' : 'استخدام البصمة';
}

function lockApp() {
  Auth.lock();
}

// ربط زر البصمة
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('biometricBtn');
  if (btn) btn.addEventListener('click', () => Auth.authenticateBiometric());
  Auth.init();
});

// --- جسيمات شاشة القفل ---
function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = Array.from({ length: 60 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 0.8,
    vy: (Math.random() - 0.5) * 0.8,
    r: Math.random() * 2 + 0.5,
    opacity: Math.random() * 0.5 + 0.1
  }));

  function animate() {
    if (document.getElementById('lockScreen').classList.contains('hidden')) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 210, 255, ${p.opacity})`;
      ctx.fill();
    });
    // رسم الخطوط
    particles.forEach((p, i) => {
      particles.slice(i + 1).forEach(p2 => {
        const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
        if (dist < 100) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(0, 210, 255, ${0.1 * (1 - dist / 100)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      });
    });
    requestAnimationFrame(animate);
  }
  animate();

  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}

window.Auth = Auth;
