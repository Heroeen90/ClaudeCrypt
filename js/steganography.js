// ===== ClaudeCrypt — Steganography Engine =====
// إخفاء رسائل مشفرة داخل الصور باستخدام LSB

'use strict';

const Steganography = {

  // إخفاء نص داخل صورة باستخدام LSB (Least Significant Bit)
  async hideMessage(imageData, message, password) {
    // تشفير الرسالة أولاً
    const encrypted = await CryptoCore.encryptAESGCM(message, password);
    const fullMessage = encrypted + '<<END>>';

    // تحويل الرسالة إلى bits
    const msgBytes = new TextEncoder().encode(fullMessage);
    const totalBits = msgBytes.length * 8;

    // التحقق من سعة الصورة
    const maxBits = Math.floor((imageData.data.length / 4) * 3);
    if (totalBits > maxBits) {
      throw new Error('الصورة صغيرة جداً لاستيعاب هذه الرسالة — جرب صورة أكبر');
    }

    const pixels = new Uint8ClampedArray(imageData.data);
    let bitIndex = 0;

    // تخزين طول الرسالة في أول 32 bit
    const lengthBits = this.numberTo32Bits(msgBytes.length);
    for (let i = 0; i < 32; i++) {
      const pixelOffset = Math.floor(i / 3) * 4 + (i % 3);
      pixels[pixelOffset] = (pixels[pixelOffset] & 0xFE) | lengthBits[i];
    }
    bitIndex = 32;

    // تخزين الرسالة
    for (let byteIdx = 0; byteIdx < msgBytes.length; byteIdx++) {
      const byte = msgBytes[byteIdx];
      for (let bitPos = 7; bitPos >= 0; bitPos--) {
        const bit = (byte >> bitPos) & 1;
        const channelIdx = bitIndex + 32;
        const pixelOffset = Math.floor(channelIdx / 3) * 4 + (channelIdx % 3);
        if (pixelOffset < pixels.length - 1) {
          pixels[pixelOffset] = (pixels[pixelOffset] & 0xFE) | bit;
        }
        bitIndex++;
      }
    }

    return new ImageData(pixels, imageData.width, imageData.height);
  },

  // استخراج رسالة مخفية
  async extractMessage(imageData, password) {
    const pixels = imageData.data;

    // قراءة طول الرسالة من أول 32 bit
    const lengthBits = [];
    for (let i = 0; i < 32; i++) {
      const pixelOffset = Math.floor(i / 3) * 4 + (i % 3);
      lengthBits.push(pixels[pixelOffset] & 1);
    }
    const msgLength = this.bitsToNumber(lengthBits);

    if (msgLength <= 0 || msgLength > 1000000) {
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
    if (endIdx === -1) throw new Error('تعذر قراءة الرسالة — قد يكون المفتاح خاطئاً');

    const encrypted = fullMessage.substring(0, endIdx);
    return await CryptoCore.decryptAESGCM(encrypted, password);
  },

  // تحميل صورة على Canvas
  loadImageToCanvas(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          resolve({ canvas, ctx, imageData: ctx.getImageData(0, 0, img.width, img.height) });
        };
        img.onerror = () => reject(new Error('تعذر تحميل الصورة'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('تعذر قراءة الملف'));
      reader.readAsDataURL(file);
    });
  },

  // أدوات مساعدة
  numberTo32Bits(num) {
    const bits = [];
    for (let i = 31; i >= 0; i--) {
      bits.push((num >> i) & 1);
    }
    return bits;
  },

  bitsToNumber(bits) {
    let num = 0;
    for (let i = 0; i < bits.length; i++) {
      num = (num << 1) | bits[i];
    }
    return num;
  },

  // حساب السعة المتاحة للصورة
  calculateCapacity(width, height) {
    const maxBytes = Math.floor((width * height * 3) / 8) - 4;
    return maxBytes;
  }
};

// --- واجهة Steganography ---
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
    const outputCanvas = document.getElementById('stegoOutput');
    outputCanvas.width = newImageData.width;
    outputCanvas.height = newImageData.height;
    outputCanvas.getContext('2d').putImageData(newImageData, 0, 0);
    stegoOutputCanvas = outputCanvas;
    document.getElementById('stegoResult').classList.remove('hidden');
    Stats.increment('stego');
    showToast('✅ تم إخفاء الرسالة بنجاح!', 'success');
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

function downloadStegoImage() {
  if (!stegoOutputCanvas) return;
  const link = document.createElement('a');
  link.download = 'claudecrypt_stego_' + Date.now() + '.png';
  link.href = stegoOutputCanvas.toDataURL('image/png');
  link.click();
  showToast('تم تحميل الصورة', 'success');
}

window.Steganography = Steganography;
