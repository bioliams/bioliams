const en = {
  title: "Dashboard",
  description: "What needs attention, and what just happened.",
  noTypes: "No record types yet. Create one in Settings → Record types.",
  lowStock: "Low stock",
  allAbove: "Everything is above threshold.",
  left: "{quantity} {unit} left",
  requestMore: "Request more",
  recent: "Recent activity",
  nothingYet: "Nothing has happened yet.",
  analytics: "Analytics",
  analyticsDesc: "What the lab registers, uses and orders — the last twelve weeks.",
  stats: {
    records: "Records",
    lowStock: "Low stock",
    openOrders: "Open orders",
    checkedOut: "Checked out",
  },
  registered: "Records registered per week",
  flow: "Stock used vs. received per week",
  used: "Used",
  received: "Received",
  mostUsed: "Most-used items",
  uses: { one: "{count} use", other: "{count} uses" },
  byMember: "Stock activity by member",
  events: { one: "{count} event", other: "{count} events" },
  footnote:
    "Numbers come from the same events the audit log records — nothing is sampled or estimated. Export any registry to Excel for deeper analysis.",
  noData: "No data yet.",
};

const fa: typeof en = {
  title: "داشبورد",
  description: "آنچه نیاز به توجه دارد و آنچه تازه اتفاق افتاده.",
  noTypes: "هنوز نوع رکوردی تعریف نشده. در تنظیمات ← انواع رکورد یکی بسازید.",
  lowStock: "موجودی کم",
  allAbove: "همه‌چیز بالاتر از حد هشدار است.",
  left: "{quantity} {unit} باقی‌مانده",
  requestMore: "درخواست خرید",
  recent: "فعالیت‌های اخیر",
  nothingYet: "هنوز اتفاقی نیفتاده.",
  analytics: "آمار",
  analyticsDesc: "آنچه آزمایشگاه ثبت، مصرف و سفارش می‌دهد — دوازده هفتهٔ اخیر.",
  stats: {
    records: "رکوردها",
    lowStock: "موجودی کم",
    openOrders: "سفارش‌های باز",
    checkedOut: "برداشته‌شده",
  },
  registered: "رکوردهای ثبت‌شده در هر هفته",
  flow: "موجودی مصرف‌شده در برابر دریافت‌شده در هر هفته",
  used: "مصرف",
  received: "دریافت",
  mostUsed: "پرمصرف‌ترین موارد",
  uses: { one: "{count} بار مصرف", other: "{count} بار مصرف" },
  byMember: "فعالیت موجودی به تفکیک اعضا",
  events: { one: "{count} رویداد", other: "{count} رویداد" },
  footnote:
    "اعداد از همان رویدادهایی می‌آیند که گزارش تغییرات ثبت می‌کند — هیچ نمونه‌گیری یا تخمینی در کار نیست. برای تحلیل بیشتر، از هر ثبت خروجی اکسل بگیرید.",
  noData: "هنوز داده‌ای نیست.",
};

const messages = { en, fa };
export default messages;
