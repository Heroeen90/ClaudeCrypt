// ===== ClaudeCrypt — محلل الشفرات =====

'use strict';

const Analyzer = {

  // تحليل تلقائي للنص
  analyze(text) {
    if (!text) return null;
    const results = [];

    // تحليل الإنتروبيا
    const entropy = this.calculateEntropy(text);
    results.push({ label: 'الإنتروبيا', value: entropy.toFixed(3) + ' bits/char' });

    // طول النص
    results.push({ label: 'الطول', value: text.length + ' حرف' });

    // كشف نوع التشفير
    const type = this.detectType(text);
    results.push({ label: 'النوع المحتمل', value: type });

    // تحليل تردد الأحرف
    const freq = this.frequencyAnalysis(text);
    results.push({ label: 'الحرف الأكثر تكراراً', value: `'${freq.most}' (${freq.mostCount}x)` });

    // هل هو Base64؟
    results.push({ label: 'Base64 صالح', value: this.isBase64(text) ? '✅ نعم' : '❌ لا' });

    // هل هو Hex؟
    results.push({ label: 'Hex صالح', value: this.isHex(text) ? '✅ نعم' : '❌ لا' });

    // هل هو Binary؟
    results.push({ label: 'Binary صالح', value: this.isBinary(text) ? '✅ نعم' : '❌ لا' });

    // هل يبدأ بـ CC (ClaudeCrypt)؟
    if (text.startsWith('CC')) {
      const ver = text.substring(0, 4);
      const versionMap = { 'CC1:': 'AES-256-GCM', 'CC2:': 'AES-256-CBC', 'CC3:': 'ثلاثي الطبقات', 'CCT:': 'كبسولة زمنية' };
      results.push({ label: 'تشفير ClaudeCrypt', value: versionMap[ver] || 'إصدار غير معروف', highlight: true });
    }

    return results;
  },

  // حساب الإنتروبيا
  calculateEntropy(text) {
    const freq = {};
    for (const char of text) freq[char] = (freq[char] || 0) + 1;
    let entropy = 0;
    const len = text.length;
    for (const count of Object.values(freq)) {
      const p = count / len;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  },

  // كشف النوع
  detectType(text) {
    const t = text.trim();
    if (t.startsWith('CC1:')) return '🔐 ClaudeCrypt AES-256-GCM';
    if (t.startsWith('CC2:')) return '🔐 ClaudeCrypt AES-256-CBC';
    if (t.startsWith('CC3:')) return '🔐 ClaudeCrypt ثلاثي الطبقات';
    if (t.startsWith('CCT:')) return '⏰ ClaudeCrypt كبسولة زمنية';
    if (this.isBinary(t)) return '💻 Binary (ثنائي)';
    if (this.isHex(t)) return '🔢 Hexadecimal';
    if (this.isMorse(t)) return '📡 Morse Code';
    if (this.isBase64(t)) return '📦 Base64';
    if (/^[A-Z\s]+$/.test(t) && t.length > 5) return '🔤 Caesar/Vigenere محتمل';
    const entropy = this.calculateEntropy(t);
    if (entropy > 4.5) return '🔒 تشفير قوي (إنتروبيا عالية)';
    if (entropy < 2) return '📝 نص عادي غير مشفر';
    return '❓ غير محدد';
  },

  // تحليل التردد
  frequencyAnalysis(text) {
    const freq = {};
    for (const char of text) {
      if (char.trim()) freq[char] = (freq[char] || 0) + 1;
    }
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    return {
      most: sorted[0]?.[0] || '-',
      mostCount: sorted[0]?.[1] || 0,
      map: freq
    };
  },

  // كسر Caesar
  breakCaesar(text) {
    const arabicFreq = 'اليةرتوبكسصدنمعهق';
    const results = [];
    for (let shift = 1; shift <= 25; shift++) {
      const decoded = text.split('').map(c => {
        if (c >= 'A' && c <= 'Z') return String.fromCharCode(((c.charCodeAt(0) - 65 - shift + 26) % 26) + 65);
        if (c >= 'a' && c <= 'z') return String.fromCharCode(((c.charCodeAt(0) - 97 - shift + 26) % 26) + 97);
        return c;
      }).join('');
      results.push({ shift, text: decoded });
    }
    return results;
  },

  // فك ROT13
  decodeROT13(text) {
    return text.replace(/[A-Za-z]/g, c => {
      const base = c <= 'Z' ? 65 : 97;
      return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
    });
  },

  // فك Base64
  decodeBase64(text) {
    try { return atob(text.trim()); }
    catch { throw new Error('النص ليس Base64 صحيحاً'); }
  },

  // فك Binary
  decodeBinary(text) {
    const bytes = text.trim().split(/\s+/);
    return bytes.map(b => {
      if (b.length === 8 && /^[01]+$/.test(b)) {
        return String.fromCharCode(parseInt(b, 2));
      }
      return b;
    }).join('');
  },

  // فك Hex
  decodeHex(text) {
    const clean = text.replace(/\s+/g, '');
    if (clean.length % 2 !== 0) throw new Error('Hex غير صحيح');
    let result = '';
    for (let i = 0; i < clean.length; i += 2) {
      result += String.fromCharCode(parseInt(clean.substr(i, 2), 16));
    }
    return result;
  },

  // فك Morse
  decodeMorse(text) {
    const morseMap = {
      '.-': 'A', '-...': 'B', '-.-.': 'C', '-..': 'D', '.': 'E',
      '..-.': 'F', '--.': 'G', '....': 'H', '..': 'I', '.---': 'J',
      '-.-': 'K', '.-..': 'L', '--': 'M', '-.': 'N', '---': 'O',
      '.--.': 'P', '--.-': 'Q', '.-.': 'R', '...': 'S', '-': 'T',
      '..-': 'U', '...-': 'V', '.--': 'W', '-..-': 'X', '-.--': 'Y',
      '--..': 'Z', '.----': '1', '..---': '2', '...--': '3',
      '....-': '4', '.....': '5', '-....': '6', '--...': '7',
      '---..': '8', '----.': '9', '-----': '0'
    };
    return text.split('   ').map(word =>
      word.split(' ').map(code => morseMap[code] || '?').join('')
    ).join(' ');
  },

  // تحليل Vigenere (كشف الطول المحتمل للمفتاح)
  analyzeVigenere(text) {
    const clean = text.toUpperCase().replace(/[^A-Z]/g, '');
    const results = [];
    for (let keyLen = 2; keyLen <= 8; keyLen++) {
      let ioc = 0;
      for (let offset = 0; offset < keyLen; offset++) {
        const column = [];
        for (let i = offset; i < clean.length; i += keyLen) column.push(clean[i]);
        const freq = {};
        for (const c of column) freq[c] = (freq[c] || 0) + 1;
        let sum = 0;
        const n = column.length;
        for (const count of Object.values(freq)) sum += count * (count - 1);
        ioc += n > 1 ? sum / (n * (n - 1)) : 0;
      }
      results.push({ keyLen, ioc: (ioc / keyLen).toFixed(4) });
    }
    const best = results.sort((a, b) => b.ioc - a.ioc)[0];
    return `الطول المحتمل للمفتاح: ${best.keyLen} (IOC: ${best.ioc})`;
  },

  // فحوصات
  isBase64(text) {
    try { return btoa(atob(text.trim())) === text.trim(); }
    catch { return false; }
  },
  isHex(text) { return /^[0-9A-Fa-f\s]+$/.test(text.trim()) && text.replace(/\s/g, '').length % 2 === 0; },
  isBinary(text) { return /^[01\s]+$/.test(text.trim()) && text.trim().split(/\s+/).every(b => b.length === 8); },
  isMorse(text) { return /^[.\-\s]+$/.test(text.trim()); }
};

// --- واجهة التحليل ---
function analyzeText() {
  const text = document.getElementById('analyzeInput').value.trim();
  if (!text) return showToast('أدخل نصاً للتحليل', 'error');

  const results = Analyzer.analyze(text);
  const container = document.getElementById('analyzeOutput');
  container.innerHTML = results.map(r => `
    <div class="analyze-item ${r.highlight ? 'highlight' : ''}">
      <span class="analyze-label">${r.label}</span>
      <span class="analyze-value">${r.value}</span>
    </div>
  `).join('');

  document.getElementById('analyzeResult').classList.remove('hidden');
}

function breakCipher(type) {
  const text = document.getElementById('analyzeInput').value.trim();
  if (!text) return showToast('أدخل نصاً أولاً', 'error');

  const resultDiv = document.getElementById('breakerResult');
  resultDiv.classList.remove('hidden');

  try {
    switch (type) {
      case 'caesar': {
        const results = Analyzer.breakCaesar(text);
        resultDiv.innerHTML = results.slice(0, 5).map(r =>
          `<div style="margin-bottom:0.5rem"><strong style="color:var(--accent-primary)">shift=${r.shift}:</strong> ${r.text.substring(0, 80)}</div>`
        ).join('') + '<div style="color:var(--text-muted);font-size:0.75rem">عرض أفضل 5 نتائج</div>';
        break;
      }
      case 'rot13':
        resultDiv.textContent = Analyzer.decodeROT13(text);
        break;
      case 'base64':
        resultDiv.textContent = Analyzer.decodeBase64(text);
        break;
      case 'vigenere':
        resultDiv.textContent = Analyzer.analyzeVigenere(text);
        break;
      case 'morse':
        resultDiv.textContent = Analyzer.decodeMorse(text);
        break;
      case 'binary':
        resultDiv.textContent = Analyzer.decodeBinary(text);
        break;
      case 'hex':
        resultDiv.textContent = Analyzer.decodeHex(text);
        break;
    }
    showToast('✅ تم التحليل', 'success');
  } catch (e) {
    resultDiv.textContent = 'خطأ: ' + e.message;
    showToast(e.message, 'error');
  }
}

window.Analyzer = Analyzer;
