// ===== ClaudeCrypt — app.js (نقطة البداية) =====

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  // تهيئة الإحصاء
  Stats.render();
  // تهيئة الدليل
  Guide.render();
});

// منع إغلاق التطبيق بالخطأ
window.addEventListener('error', (e) => {
  console.error('ClaudeCrypt Error:', e.message);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('ClaudeCrypt Promise Error:', e.reason);
  if (typeof showToast === 'function') {
    showToast('خطأ غير متوقع: ' + (e.reason?.message || 'حاول مجدداً'), 'error');
  }
  e.preventDefault();
});
