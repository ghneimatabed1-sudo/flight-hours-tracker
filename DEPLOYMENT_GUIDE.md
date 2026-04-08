# دليل التثبيت - Flight Hours Tracker

## للمطور (أنت)

### 1. توليد License Key لصاحبك

**الطريقة الأولى: استخدام HTML Generator (الأسهل)**
1. افتح ملف `LICENSE_KEY_GENERATOR.html` في أي متصفح
2. اختر المدة (مثلاً 365 يوم = سنة)
3. اضغط "Generate License Key"
4. انسخ المفتاح وأرسله لصاحبك

**الطريقة الثانية: استخدام Node.js**
```bash
cd /home/ubuntu/flight_hours_tracker
node -e "
const CryptoJS = require('crypto-js');
const { encode } = require('base-64');
const SECRET_KEY = 'FHT_2024_SECRET_KEY_DO_NOT_SHARE';
function generateLicenseKey(durationDays, username = '') {
  const now = new Date();
  const expirationDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
  const payload = expirationDate.toISOString() + '|' + username + '|' + now.toISOString();
  const encodedPayload = encode(payload).replace(/=/g, '');
  const hash = CryptoJS.HmacSHA256(payload, SECRET_KEY);
  const signature = hash.toString(CryptoJS.enc.Hex).substring(0, 16);
  return 'FHT-' + encodedPayload + '-' + signature;
}
console.log(generateLicenseKey(365, 'YOUR_FRIEND_NAME'));
"
```

### 2. بناء التطبيق (APK)

**خيار 1: Expo Go (للتجربة السريعة)**
- صاحبك ينزل Expo Go من Google Play
- تعطيه QR Code من Manus
- يفتح التطبيق مباشرة بدون تثبيت

**خيار 2: APK Production Build (للاستخدام الدائم)**
```bash
# في Manus UI، اضغط على زر "Publish" في الأعلى
# بعد الـ Publish، راح يعطيك رابط APK
# حمّل الـ APK وأرسله لصاحبك
```

---

## لصاحبك (المستخدم)

### طريقة 1: استخدام Expo Go (تجريبي)

1. **تنزيل Expo Go:**
   - افتح Google Play Store
   - ابحث عن "Expo Go"
   - نزّل التطبيق

2. **فتح التطبيق:**
   - افتح Expo Go
   - اضغط "Scan QR Code"
   - صوّر الـ QR Code اللي بعثلك إياه صاحبك

3. **تفعيل الترخيص:**
   - أول ما يفتح التطبيق، راح يطلب License Key
   - الصق المفتاح اللي بعثلك إياه صاحبك
   - اضغط "Activate"

### طريقة 2: تثبيت APK (دائم)

1. **تنزيل APK:**
   - راح يوصلك رابط تحميل APK من صاحبك
   - اضغط على الرابط وحمّل الملف

2. **السماح بالتثبيت من مصادر غير معروفة:**
   - افتح Settings → Security
   - فعّل "Install unknown apps" أو "Unknown sources"
   - اختر المتصفح اللي حملت منه الـ APK

3. **تثبيت التطبيق:**
   - افتح ملف الـ APK من Downloads
   - اضغط "Install"
   - انتظر حتى ينتهي التثبيت

4. **تفعيل الترخيص:**
   - افتح التطبيق
   - راح يطلب License Key
   - الصق المفتاح اللي بعثلك إياه صاحبك
   - اضغط "Activate"

---

## مشاكل شائعة وحلولها

### المشكلة: "Invalid License Key"
**الحل:**
- تأكد إنك نسخت المفتاح كامل بدون مسافات زيادة
- تأكد إن المفتاح يبدأ بـ `FHT-`
- اطلب مفتاح جديد من صاحبك

### المشكلة: "License Expired"
**الحل:**
- المفتاح انتهت صلاحيته
- اطلب مفتاح جديد من صاحبك

### المشكلة: "This device is already activated with a different license"
**الحل:**
- التطبيق مربوط بمفتاح قديم
- امسح بيانات التطبيق:
  - Settings → Apps → Flight Hours Tracker → Storage → Clear Data
- افتح التطبيق مرة ثانية وفعّل بالمفتاح الجديد

### المشكلة: التطبيق ما يفتح في Expo Go
**الحل:**
- تأكد إن Expo Go محدّث لآخر إصدار
- تأكد إن الموبايل متصل بالإنترنت
- جرب تسكّر Expo Go وتفتحه مرة ثانية
- جرب تمسح الـ cache: Expo Go → Settings → Clear cache

---

## ملاحظات مهمة

### للمطور:
- **لا تشارك ملف LICENSE_KEY_GENERATOR.html مع أي حد** - هذا الملف يسمح بتوليد مفاتيح غير محدودة
- **احتفظ بنسخة من المفاتيح اللي ولدتها** - عشان تعرف متى تنتهي صلاحيتها
- **كل مفتاح مربوط بجهاز واحد** - لو صاحبك غيّر موبايل، لازم تعطيه مفتاح جديد

### للمستخدم:
- **لا تشارك المفتاح مع أي حد** - كل مفتاح يشتغل على جهاز واحد فقط
- **احتفظ بنسخة من المفتاح** - لو مسحت التطبيق، راح تحتاج المفتاح مرة ثانية
- **البيانات محفوظة محلياً** - كل بياناتك على موبايلك، ما في سيرفر خارجي

---

## مفتاح تجريبي (365 يوم)

```
FHT-MjAyNy0wMS0yNVQyMDo0ODoxMS41ODFafFRFU1RfVVNFUnwyMDI2LTAxLTI1VDIwOjQ4OjExLjU4MVo-241273196330859a
```

**صلاحية المفتاح:** حتى 25 يناير 2027

استخدم هذا المفتاح للتجربة. لو بدك مفتاح أطول أو أقصر، استخدم HTML Generator.

---

## دعم فني

لو واجهتك أي مشكلة، تواصل مع المطور (صاحبك اللي عطاك التطبيق).
