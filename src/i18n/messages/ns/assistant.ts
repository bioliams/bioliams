const en = {
  title: "Lab assistant",
  description:
    "Ask about samples, stock and activity in plain language. It reads the same records you can — nothing more.",
  settings: "AI settings",
  suggestions: {
    low: "What’s running low?",
    where: "Where are the PT-014 aliquots?",
    week: "What was used this week?",
    proteinase: "Do we have any Proteinase K left?",
  },
  notConfigured:
    "No AI provider is configured for this lab yet. An admin can add a key — Gemini, Groq, OpenAI or a self-hosted Ollama all work — under Settings → AI assistant.",
  empty: "Ask anything about the lab’s records and stock.",
  checking: "Checking the records…",
  placeholder: "e.g. how much Taq do we have, and where is it?",
  label: "Ask the lab assistant",
  ask: "Ask",
  sharedKey: "Using the shared demo model — add your lab’s own key in Settings → AI assistant.",
};

const fa: typeof en = {
  title: "دستیار آزمایشگاه",
  description:
    "دربارهٔ نمونه‌ها، موجودی و فعالیت‌ها به زبان ساده بپرسید. فقط همان رکوردهایی را می‌خواند که شما می‌توانید ببینید — نه بیشتر.",
  settings: "تنظیمات هوش مصنوعی",
  suggestions: {
    low: "موجودی چه چیزهایی کم است؟",
    where: "آلیکوت‌های PT-014 کجا هستند؟",
    week: "این هفته چه چیزهایی مصرف شد؟",
    proteinase: "پروتئیناز K باقی مانده است؟",
  },
  notConfigured:
    "هنوز هیچ ارائه‌دهندهٔ هوش مصنوعی برای این آزمایشگاه تنظیم نشده. یک مدیر می‌تواند در تنظیمات ← دستیار هوش مصنوعی کلیدی اضافه کند — Gemini، Groq، OpenAI یا Ollama روی سرور خودتان همگی کار می‌کنند.",
  empty: "هر سؤالی دربارهٔ رکوردها و موجودی آزمایشگاه دارید بپرسید.",
  checking: "در حال بررسی رکوردها…",
  placeholder: "مثلاً چقدر Taq داریم و کجاست؟",
  label: "پرسش از دستیار آزمایشگاه",
  ask: "بپرس",
  sharedKey: "در حال استفاده از مدل نمایشی مشترک — کلید آزمایشگاه خود را در تنظیمات ← دستیار هوش مصنوعی اضافه کنید.",
};

const messages = { en, fa };
export default messages;
