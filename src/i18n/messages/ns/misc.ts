const en = {
  search: {
    title: "Search",
    resultsFor: "Results for “{query}”",
    found: {
      one: "{count} record across every registry — names, IDs and field values.",
      other: "{count} records across every registry — names, IDs and field values.",
    },
    hint: "Search every registry at once from the box in the header.",
    nothing: "Nothing matches “{query}”.",
  },
  labels: {
    title: "Labels",
    description: {
      one: "{count} label. Scanning one opens that record — a phone camera is enough, there is nothing to install.",
      other: "{count} labels. Scanning one opens that record — a phone camera is enough, there is nothing to install.",
    },
    done: "Done",
    print: "Print",
    nothing: "Nothing to print. Open a record and choose “Print label”.",
  },
  scan: {
    title: "Scan a label",
    description:
      "Opens the record the label belongs to. Works with a phone camera, a USB scanner, or the ID typed by hand.",
    unsupported:
      "This browser can’t use the camera scanner. Your phone’s own camera app will still open a label — or type the ID below.",
    denied: "Camera permission was refused, so use the ID below instead.",
    point: "Point the camera at a label to open that record.",
    start: "Start camera",
    placeholder: "or type an ID, e.g. RGT-000006",
    open: "Open",
    notFoundTitle: "No record for that label",
    notFoundBefore: "Nothing in this lab has the ID",
    notFoundAfter: ". The label may belong to another lab, or the record may have been archived.",
    backToDashboard: "Back to dashboard",
  },
  actor: {
    system: "System",
  },
};

const fa: typeof en = {
  search: {
    title: "جستجو",
    resultsFor: "نتایج «{query}»",
    found: {
      one: "{count} رکورد در همهٔ ثبت‌ها — نام‌ها، شناسه‌ها و مقادیر فیلدها.",
      other: "{count} رکورد در همهٔ ثبت‌ها — نام‌ها، شناسه‌ها و مقادیر فیلدها.",
    },
    hint: "از کادر بالای صفحه، همهٔ ثبت‌ها را یک‌جا جستجو کنید.",
    nothing: "موردی با «{query}» پیدا نشد.",
  },
  labels: {
    title: "برچسب‌ها",
    description: {
      one: "{count} برچسب. اسکن هر برچسب رکورد آن را باز می‌کند — دوربین گوشی کافی است و نیازی به نصب چیزی نیست.",
      other: "{count} برچسب. اسکن هر برچسب رکورد آن را باز می‌کند — دوربین گوشی کافی است و نیازی به نصب چیزی نیست.",
    },
    done: "تمام",
    print: "چاپ",
    nothing: "چیزی برای چاپ نیست. یک رکورد را باز کنید و «چاپ برچسب» را بزنید.",
  },
  scan: {
    title: "اسکن برچسب",
    description:
      "رکوردی را که برچسب به آن تعلق دارد باز می‌کند. با دوربین گوشی، اسکنر USB یا تایپ دستی شناسه کار می‌کند.",
    unsupported:
      "این مرورگر نمی‌تواند از اسکنر دوربین استفاده کند. برنامهٔ دوربین گوشی شما همچنان برچسب را باز می‌کند — یا شناسه را در زیر وارد کنید.",
    denied: "اجازهٔ دسترسی به دوربین داده نشد؛ از کادر شناسه در زیر استفاده کنید.",
    point: "دوربین را به سمت یک برچسب بگیرید تا رکورد آن باز شود.",
    start: "روشن کردن دوربین",
    placeholder: "یا شناسه را وارد کنید، مثلاً RGT-000006",
    open: "باز کردن",
    notFoundTitle: "رکوردی برای این برچسب نیست",
    notFoundBefore: "هیچ موردی در این آزمایشگاه شناسهٔ",
    notFoundAfter: " را ندارد. ممکن است برچسب مال آزمایشگاه دیگری باشد یا رکورد بایگانی شده باشد.",
    backToDashboard: "بازگشت به داشبورد",
  },
  actor: {
    system: "سیستم",
  },
};

const messages = { en, fa };
export default messages;
