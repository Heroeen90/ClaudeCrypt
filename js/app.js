// ===== ClaudeCrypt — app.js =====

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  Stats.render();
  Guide.render();
});

// تهيئة الصفحة الأولى بعد فتح التطبيق
function onAppUnlocked() {
  // إظهار صفحة التشفير افتراضياً
  document.querySelectorAll('.page').forEach(p => {
    p.style.display = 'none';
    p.classList.remove('active');
  });
  const firstPage = document.getElementById('page-encrypt');
  if (firstPage) {
    firstPage.style.display = 'block';
    firstPage.classList.add('active');
  }
  const firstBtn = document.querySelector('.nav-btn[data-page="encrypt"]');
  if (firstBtn) firstBtn.classList.add('active');
}

window.addEventListener('error', (e) => {
  console.error('ClaudeCrypt Error:', e.message);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('ClaudeCrypt Promise Error:', e.reason);
  if (typeof showToast === 'function') {
    showToast('خطأ: ' + (e.reason?.message || 'حاول مجدداً'), 'error');
  }
  e.preventDefault();
});

window.onAppUnlocked = onAppUnlocked;
