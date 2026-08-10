# صحة CRM (Saha CRM)

أداة متابعة المراجعين لموظفي الصحة في السعودية. يرفع الموظف ملفات المراجعين
(طب الأسرة والتطعيم) بصيغة Excel، فيعرض الموقع بيانات كل مراجع، ويتيح الاتصال
به بضغطة زر عبر تطبيق خارجي، وتصنيف نتيجة المكالمة، ثم تصدير تقرير PDF.

A client-side follow-up tool for Saudi health staff. The employee uploads
patient Excel files (family medicine + vaccination); the app displays each
record, enables one-tap calling via an external dialer, lets the employee
classify the call outcome, and exports a PDF report.

## الخصوصية / Privacy

- **لا يتم حفظ أي بيانات على أي خادم** — تتم كل المعالجة داخل المتصفح.
- **بدون تسجيل دخول.**
- تُحفظ الجلسة في `sessionStorage` فقط، وتُمسح تلقائيًا عند إغلاق المتصفح.
- No backend, no database, no login. All processing happens in the browser and
  data lives only in `sessionStorage` (cleared when the browser/tab closes).

## المزايا / Features

- رفع ملفين Excel: طب الأسرة والتطعيم (يتعرف على الأعمدة العربية تلقائيًا).
- عرض: اسم المراجع، رقم الهوية، موعد ووقت الحجز، اسم الطبيب، التخصص، رقم الاتصال.
- زر اتصال يفتح التطبيق الخارجي (الافتراضي `tel:`؛ قابل للتخصيص لـ Zain Calls Pro).
- تصنيف كل مكالمة: 🔴 لم يرد / 🟡 غير راضٍ / 🟢 راضٍ.
- تصدير تقرير PDF بأسماء المراجعين وأرقام هوياتهم وتصنيفاتهم الملونة.
- واجهة عربية (RTL).

## التقنيات / Tech stack

React + TypeScript + Vite · SheetJS (`xlsx`) لقراءة Excel · `jsPDF` + `html2canvas`
لتصدير PDF. تطبيق ثابت بالكامل قابل للنشر على GitHub Pages.

## التشغيل محليًا / Run locally

```bash
npm install
npm run dev          # http://localhost:5173
```

توليد ملفات Excel تجريبية للتجربة / generate sample Excel files:

```bash
npm run gen:samples  # -> samples/family-medicine.xlsx, samples/vaccination.xlsx
```

سكربتات أخرى / other scripts:

| Command | Description |
| --- | --- |
| `npm run build` | Type-check and build the static site into `dist/` |
| `npm run preview` | Preview the production build |
| `npm run typecheck` | Type-check only |

## النشر على GitHub Pages / Deploy to GitHub Pages

يتضمن المستودع سير عمل GitHub Actions (`.github/workflows/deploy.yml`) ينشر
الموقع تلقائيًا عند الدفع إلى `main`.

1. في إعدادات المستودع: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. ادفع إلى `main`؛ سيبني السير العمل الموقع وينشره.
3. يُضبط `base` تلقائيًا على اسم المستودع (`/<repo>/`). لنطاق مخصص عيّن `VITE_BASE`.

## الاتصال عبر Zain Calls Pro

زر الاتصال يستخدم `tel:` افتراضيًا، وهو ما يفتح تطبيق الاتصال على iOS. لتوجيه
المكالمات إلى Zain Calls Pro، يمكن تعيينه كتطبيق الاتصال الافتراضي على الجهاز،
أو إدخال رابط مخصص للتطبيق من زر الإعدادات (⚙︎) داخل الموقع.
