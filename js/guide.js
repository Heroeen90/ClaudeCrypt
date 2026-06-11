// ===== ClaudeCrypt — الدليل الإرشادي الكامل =====

'use strict';

const Guide = {

  sections: [
    {
      id: 'intro',
      title: '🌟 مرحباً بك في ClaudeCrypt',
      content: [
        { type: 'p', text: 'ClaudeCrypt هو نظام تشفير متقدم مبني على أحدث معايير التشفير العالمية. يعمل بالكامل على جهازك دون إرسال أي بيانات للإنترنت.' },
        { type: 'tip', text: '💡 جميع عمليات التشفير تتم محلياً على هاتفك — بياناتك لا تغادر جهازك أبداً.' },
        { type: 'p', text: 'تم تطوير ClaudeCrypt بالتعاون مع Claude AI من Anthropic، ليكون أداة تشفير مجانية ومتاحة للجميع.' }
      ]
    },
    {
      id: 'lock',
      title: '🔒 نظام القفل والبصمة',
      content: [
        { type: 'p', text: 'عند أول تشغيل، ستُطلب منك إعداد بصمة إصبعك أو رمز دخول سري من 6 أرقام.' },
        { type: 'p', text: 'البصمة تستخدم WebAuthn — معيار أمان عالمي يحمي بياناتك على مستوى الجهاز.' },
        { type: 'tip', text: '💡 إذا لم تعمل البصمة على جهازك، استخدم رمز الـ 6 أرقام كبديل آمن.' },
        { type: 'p', text: 'لقفل التطبيق في أي وقت، اضغط أيقونة القفل 🔒 في الهيدر العلوي.' }
      ]
    },
    {
      id: 'encrypt',
      title: '🔐 تشفير النصوص والملفات',
      content: [
        { type: 'p', text: 'يدعم ClaudeCrypt تشفير النصوص والملفات بعدة خوارزميات:' },
        { type: 'p', text: '• AES-256-GCM: الأسرع والأكثر أماناً — موصى به للاستخدام اليومي.' },
        { type: 'p', text: '• AES-256-CBC: خوارزمية كلاسيكية قوية ومتوافقة مع أنظمة أخرى.' },
        { type: 'p', text: '• ChaCha20: سريع جداً على الأجهزة المحمولة.' },
        { type: 'p', text: '• ثلاثي الطبقات: الأقوى — يطبق ريمان + AES-GCM + AES-CBC معاً.' },
        { type: 'tip', text: '💡 كلما كان مفتاحك أطول وأكثر تعقيداً، كان التشفير أصعب كسراً. استخدم "توليد مفتاح عشوائي" للحصول على أقوى مفتاح.' }
      ]
    },
    {
      id: 'riemann',
      title: '🌊 طبقة أصفار ريمان',
      content: [
        { type: 'p', text: 'معادلة ريمان من أعظم المعادلات في الرياضيات. أصفارها غير البديهية تقع كلها على خط مستقيم وتوزعها شبه عشوائي.' },
        { type: 'p', text: 'ClaudeCrypt يستخدم أول 30 صفراً معروفاً من هذه الأصفار لتوليد مصفوفة XOR تضاف كطبقة إضافية فوق التشفير الرئيسي.' },
        { type: 'tip', text: '💡 فعّل خيار "أصفار ريمان" للحصول على طبقة حماية رياضية إضافية.' }
      ]
    },
    {
      id: 'timelok',
      title: '⏰ الكبسولة الزمنية',
      content: [
        { type: 'p', text: 'تشفير الكبسولة الزمنية يمنع فك التشفير قبل تاريخ محدد في المستقبل.' },
        { type: 'p', text: 'مثالية للوصايا، الرسائل المؤجلة، والمفاجآت الشخصية.' },
        { type: 'tip', text: '💡 احفظ المفتاح جيداً — لن يمكنك فك التشفير قبل التاريخ المحدد حتى بالمفتاح الصحيح.' }
      ]
    },
    {
      id: 'stego',
      title: '🖼️ إخفاء الرسائل في الصور',
      content: [
        { type: 'p', text: 'تقنية Steganography تخفي رسالة مشفرة داخل بكسلات الصورة باستخدام خوارزمية LSB.' },
        { type: 'p', text: 'الصورة الناتجة تبدو مطابقة للأصل بالعين المجردة، لكنها تحمل رسالتك المخفية.' },
        { type: 'p', text: 'لاستخراج الرسالة، أرسل الصورة للطرف الآخر مع المفتاح السري فقط.' },
        { type: 'tip', text: '💡 استخدم صوراً PNG للحصول على أفضل نتيجة. صور JPG قد تفقد البيانات المخفية.' }
      ]
    },
    {
      id: 'analyze',
      title: '🔬 محلل الشفرات',
      content: [
        { type: 'p', text: 'المحلل يكشف تلقائياً نوع التشفير المستخدم ويعطيك معلومات تقنية دقيقة.' },
        { type: 'p', text: 'يدعم كسر الشفرات الكلاسيكية:' },
        { type: 'p', text: '• Caesar: يجرب كل 25 إزاحة ممكنة تلقائياً.' },
        { type: 'p', text: '• ROT13: تشفير Caesar بإزاحة 13.' },
        { type: 'p', text: '• Base64, Hex, Binary, Morse: فك تشفير فوري.' },
        { type: 'p', text: '• Vigenere: تحليل إحصائي للطول المحتمل للمفتاح.' },
        { type: 'tip', text: '💡 الإنتروبيا العالية (>4.5) تدل على تشفير قوي لا يمكن كسره بالطرق الكلاسيكية.' }
      ]
    },
    {
      id: 'keygen',
      title: '⚡ مولد المفاتيح',
      content: [
        { type: 'p', text: 'يوفر مولد المفاتيح طرقاً متعددة لتوليد مفاتيح قوية:' },
        { type: 'p', text: '• عشوائي: يستخدم Web Crypto API للعشوائية الحقيقية.' },
        { type: 'p', text: '• ريمان: يشتق المفتاح من أصفار معادلة ريمان.' },
        { type: 'p', text: '• عبارة مرور: كلمات عربية عشوائية سهلة الحفظ.' },
        { type: 'p', text: '• من حركة الهاتف: يستخدم الجيروسكوب لعشوائية فيزيائية حقيقية.' },
        { type: 'p', text: '• من صورة: يشتق المفتاح من بكسلات صورة تختارها.' },
        { type: 'tip', text: '💡 المفتاح الجيد: 16+ حرف، يحتوي أحرفاً وأرقاماً ورموزاً.' }
      ]
    },
    {
      id: 'vault',
      title: '🔐 الحافظة الآمنة',
      content: [
        { type: 'p', text: 'الحافظة تحفظ مفاتيح تشفيرك ومعلومات الملفات المشفرة حتى لا تضيع.' },
        { type: 'p', text: 'بعد كل عملية تشفير، اضغط "حفظ في الحافظة" لتسجيل المفتاح واسم الملف.' },
        { type: 'tip', text: '⚠️ الحافظة محفوظة محلياً — لا تمسح بيانات التطبيق من الهاتف أو ستفقد المفاتيح!' }
      ]
    },
    {
      id: 'security',
      title: '🛡️ نصائح الأمان',
      content: [
        { type: 'p', text: '1. لا تشارك مفتاحك إلا مع الشخص المقصود وبقناة آمنة منفصلة.' },
        { type: 'p', text: '2. استخدم مفتاحاً مختلفاً لكل رسالة مهمة.' },
        { type: 'p', text: '3. حافظ على نسخة احتياطية من مفاتيحك المهمة في مكان آمن.' },
        { type: 'p', text: '4. لا ترسل الرسالة المشفرة والمفتاح في نفس القناة.' },
        { type: 'tip', text: '💡 أرسل الرسالة المشفرة عبر واتساب والمفتاح عبر إيميل — هكذا لو اخترقوا واحدة لن يستطيعوا فك الشفرة.' }
      ]
    }
  ],

  render() {
    const container = document.getElementById('guideContent');
    if (!container) return;
    container.innerHTML = this.sections.map(section => `
      <div class="guide-section" data-id="${section.id}">
        <h4>${section.title}</h4>
        ${section.content.map(item => {
          if (item.type === 'p') return `<p>${item.text}</p>`;
          if (item.type === 'tip') return `<div class="tip">${item.text}</div>`;
          return '';
        }).join('')}
      </div>
    `).join('');
  },

  search(query) {
    const container = document.getElementById('guideContent');
    if (!container) return;
    const q = query.toLowerCase().trim();
    if (!q) { this.render(); return; }

    const filtered = this.sections.filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.content.some(c => c.text.toLowerCase().includes(q))
    );

    if (filtered.length === 0) {
      container.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:2rem">لا توجد نتائج</div>';
      return;
    }

    container.innerHTML = filtered.map(section => `
      <div class="guide-section">
        <h4>${section.title}</h4>
        ${section.content.map(item => {
          let text = item.text;
          const regex = new RegExp(`(${q})`, 'gi');
          text = text.replace(regex, '<mark style="background:rgba(0,210,255,0.3);border-radius:3px">$1</mark>');
          if (item.type === 'p') return `<p>${text}</p>`;
          if (item.type === 'tip') return `<div class="tip">${text}</div>`;
          return '';
        }).join('')}
      </div>
    `).join('');
  }
};

function openGuide() {
  Guide.render();
  document.getElementById('guideModal').classList.remove('hidden');
}

function closeGuide() {
  document.getElementById('guideModal').classList.add('hidden');
}

function searchGuide(query) {
  Guide.search(query);
}

window.Guide = Guide;
