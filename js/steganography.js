// ===== ClaudeCrypt — Steganography Engine (نسخة مُصلحة) =====

'use strict';

const Steganography = {

  // إخفاء نص داخل صورة باستخدام LSB
  async hideMessage(imageData, message, password) {
    const encrypted = await CryptoCore.encryptAESGCM(message, password);
    const fullMessage = encrypted + '<<END>>';
    const msgBytes = new TextEncoder().encode(fullMessage);
    const totalBits = msgBytes.length * 8;
    const maxBits = Math.floor((imageData.data.length / 4) * 3);

    if (totalBits > maxBits) {
      throw new Error('الصورة صغيرة جداً — جرب صورة أكبر');
    }

    const pixels = new Uint8ClampedArray(imageData.data);

    // تخزين طول الرسالة في أول 32 bit
    const msgLen = msgBytes.length;
    for (let i = 0; i < 32; i++) {
      const bit = (msgLen >> (31 - i)) & 1;
      const pixelOffset = Math.floor(i / 3) * 4 + (i % 3);
      if (pixelOffset < pixels.length - 1) {
        pixels[pixelOffset] = (pixels[pixelOffset] & 0xFE) | bit;
      }
    }

    // تخزين بيانات الرسالة
    for (let byteIdx = 0; byteIdx < msgBytes.length; byteIdx++) {
      const byte = msgBytes[byteIdx];
      for (let bitPos = 7; bitPos >= 0; bitPos--) {
        const bit = (byte >> bitPos) & 1;
        const channelIdx = (byteIdx * 8 + (7 - bitPos)) + 32;
        const pixelOffset = Math.floor(channelIdx / 3) * 4 + (channelIdx % 3);
        if (pixelOffset < pixels.length - 1) {
          pixels[pixelOffset] = (pixels[pixelOffset] & 0xFE) | bit;
        }
      }
    }

    return new ImageData(pixels, imageData.width, imageData.height);
  },

  // استخراج رسالة مخفية
  async extractMessage(imageData, password) {
    const pixels = imageData.data;

    // قراءة طول الرسالة من أول 32 bit
    let msgLength = 0;
    for (let i = 0; i < 32; i++) {
      const pixelOffset = Math.floor(i / 3) * 4 + (i % 3);
      const bit = pixels[pixelOffset] & 1;
      msgLength = (msgLength << 1) | bit;
    }

    if (msgLength <= 0 || msgLength > 500000) {
      throw new Error('لا توجد رسالة مخفية في هذه الصورة');
    }

    // استخراج bytes الرسالة
    const msgBytes = new Uint8Array(msgLength);
    for (let byteIdx = 0; byteIdx < msgLength; byteIdx++) {
      let byte = 0;
      for (let bitPos = 7; bitPos >= 0; bitPos--) {
        const channelIdx = (byteIdx * 8 + (7 - bitPos)) + 32;
        const pixelOffset = Math.floor(channelIdx / 3) * 4 + (channelIdx % 3);
        if (pixelOffset < pixels.length - 1) {
          byte = (byte << 1) | (pixels[pixelOffset] & 1);
        }
      }
      msgBytes[byteIdx] = byte;
    }

    const fullMessage = new TextDecoder().decode(msgBytes);
    const endIdx = fullMessage.indexOf('<<END>>');
    if (endIdx === -1) {
      throw new Error('تعذر قراءة الرسالة — قد يكون المفتاح خاطئاً أو الصورة تالفة');
    }

    const encrypted = fullMessage.substring(0, endIdx);
    try {
      return await CryptoCore.decryptAESGCM(encrypted, password);
    } catch (e) {
      throw new Error('المفتاح خاطئ — تأكد من استخدام نفس المفتاح');
    }
  },

  // تحميل صورة على Canvas — مهم: نحفظ كـ PNG دائماً
  loadImageToCanvas(file) {
    return new Promise((resolve, reject) => {
      // التحقق من نوع الملف
      if (!file.type.startsWith('image/')) {
        return reject(new Error('الملف ليس صورة'));
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          resolve({ canvas, ctx, imageData });
        };
        img.onerror = () => reject(new Error('تعذر تحميل الصورة'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('تعذر قراءة الملف'));
      reader.readAsDataURL(file);
    });
  },

  calculateCapacity(width, height) {
    return Math.floor((width * height * 3) / 8) - 4;
  }
};

// --- حالة Steganography ---
let stegoImageData = null;
let stegoExtImageData = null;
let stegoMode = 'hide';
let stegoOutputCanvas = null;

function setStegoMode(mode, btn) {
  stegoMode = mode;
  document.querySelectorAll('#page-stego .toggle-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('stegoHide').classList.toggle('hidden', mode !== 'hide');
  document.getElementById('stegoExtract').classList.toggle('hidden', mode !== 'extract');
}

function loadStegoImage(input) {
  if (!input.files[0]) return;
  const file = input.files[0];
  Steganography.loadImageToCanvas(file).then(({ canvas, imageData }) => {
    stegoImageData = imageData;
    const preview = document.getElementById('stegoCanvas');
    preview.width = canvas.width;
    preview.height = canvas.height;
    preview.getContext('2d').putImageData(imageData, 0, 0);
    preview.classList.remove('hidden');
    const cap = Steganography.calculateCapacity(canvas.width, canvas.height);
    showToast(`الصورة جاهزة — السعة: ${CryptoCore.formatSize(cap)}`, 'success');
  }).catch(e => showToast(e.message, 'error'));
}

function loadExtractImage(input) {
  if (!input.files[0]) return;
  Steganography.loadImageToCanvas(input.files[0]).then(({ imageData }) => {
    stegoExtImageData = imageData;
    showToast('الصورة محملة — جاهز للاستخراج', 'success');
  }).catch(e => showToast(e.message, 'error'));
}

async function hideInImage() {
  if (!stegoImageData) return showToast('اختر صورة أولاً', 'error');
  const message = document.getElementById('stegoMessage').value.trim();
  const key = document.getElementById('stegoKey').value.trim();
  if (!message) return showToast('أدخل الرسالة', 'error');
  if (!key) return showToast('أدخل مفتاح التشفير', 'error');

  try {
    showToast('جاري إخفاء الرسالة...', '');
    const newImageData = await Steganography.hideMessage(stegoImageData, message, key);

    // رسم النتيجة على canvas جديد
    const outputCanvas = document.getElementById('stegoOutput');
    outputCanvas.width = newImageData.width;
    outputCanvas.height = newImageData.height;
    const ctx = outputCanvas.getContext('2d', { willReadFrequently: true });
    ctx.putImageData(newImageData, 0, 0);
    stegoOutputCanvas = outputCanvas;

    document.getElementById('stegoResult').classList.remove('hidden');
    Stats.increment('stego');
    logActivity('🖼️', 'إخفاء رسالة في صورة');
    showToast('✅ تم إخفاء الرسالة — حمّل الصورة كـ PNG', 'success');
  } catch (e) {
    showToast('خطأ: ' + e.message, 'error');
  }
}

async function extractFromImage() {
  if (!stegoExtImageData) return showToast('اختر صورة أولاً', 'error');
  const key = document.getElementById('stegoExtKey').value.trim();
  if (!key) return showToast('أدخل مفتاح التشفير', 'error');

  try {
    showToast('جاري استخراج الرسالة...', '');
    const message = await Steganography.extractMessage(stegoExtImageData, key);
    document.getElementById('stegoExtOutput').textContent = message;
    document.getElementById('stegoExtResult').classList.remove('hidden');
    showToast('✅ تم استخراج الرسالة!', 'success');
  } catch (e) {
    showToast('خطأ: ' + e.message, 'error');
  }
}

// تحميل الصورة دائماً كـ PNG للحفاظ على البيانات المخفية
function downloadStegoImage() {
  if (!stegoOutputCanvas) return;
  stegoOutputCanvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'claudecrypt_hidden_' + Date.now() + '.png';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    showToast('✅ تم التحميل كـ PNG — لا تحوّلها لـ JPG!', 'success');
  }, 'image/png', 1.0);
}

window.Steganography = Steganography;
