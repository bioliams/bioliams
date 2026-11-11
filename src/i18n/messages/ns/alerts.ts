const en = {
  kinds: {
    expired: "Expired",
    expiring: "Expiring soon",
    out_of_stock: "Out of stock",
    low_stock: "Low stock",
  },
  outOfStock: "{name} is out of stock",
  outOfStockZero:
    "{name} is out of stock — {quantity} {unit} left, at or below its zero point of {zero} {unit}",
  lowStock: "{name} is running low — {quantity} {unit} left (minimum {min} {unit})",
  expired: "{name} expired on {date}",
  expiresToday: "{name} expires today ({date})",
  expiresIn: { one: "{name} expires in {count} day ({date})", other: "{name} expires in {count} days ({date})" },
  resolvedLine: "{kind}: {name}",
  badgeExpiresToday: "Expires today",
  badgeExpiresIn: "Expires in {count}d",
  ok: "OK",
  notStocked: "Not stocked",
  notStockedTitle: "No stock has been recorded for this item",
  bell: {
    title: "Stock alarms",
    label: "Notifications",
    labelUnread: "Notifications, {count} unread",
    markAllRead: "Mark all read",
    empty: "Nothing expired, expiring or out of stock.",
    openCenter: "Open notification center",
  },
  page: {
    title: "Notifications",
    description:
      "Alarms for stock that has expired, expires within {days} days, has fallen to its low level, or reached its zero point. They clear themselves once the item is restocked, re-dated or discarded.",
    active: "Active",
    resolved: "Resolved",
    count: "{count} × {kind}",
    raised: "raised {when}",
    resolvedAt: "resolved {when}",
    noneResolved: "No resolved alarms yet.",
    allClear: "All clear — nothing expired, expiring or out of stock.",
  },
};

const fa: typeof en = {
  kinds: {
    expired: "منقضی شده",
    expiring: "نزدیک به انقضا",
    out_of_stock: "تمام شده",
    low_stock: "موجودی کم",
  },
  outOfStock: "موجودی {name} تمام شده است",
  outOfStockZero:
    "موجودی {name} تمام شده است — {quantity} {unit} باقی مانده که به نقطهٔ صفر ({zero} {unit}) رسیده یا کمتر است",
  lowStock: "موجودی {name} رو به اتمام است — {quantity} {unit} باقی مانده (حداقل {min} {unit})",
  expired: "تاریخ انقضای {name} در {date} گذشته است",
  expiresToday: "{name} امروز ({date}) منقضی می‌شود",
  expiresIn: { one: "{name} تا {count} روز دیگر ({date}) منقضی می‌شود", other: "{name} تا {count} روز دیگر ({date}) منقضی می‌شود" },
  resolvedLine: "{kind}: {name}",
  badgeExpiresToday: "انقضا: امروز",
  badgeExpiresIn: "انقضا تا {count} روز",
  ok: "عادی",
  notStocked: "ثبت نشده",
  notStockedTitle: "هنوز موجودی‌ای برای این مورد ثبت نشده",
  bell: {
    title: "هشدارهای موجودی",
    label: "اعلان‌ها",
    labelUnread: "اعلان‌ها، {count} خوانده‌نشده",
    markAllRead: "خواندن همه",
    empty: "هیچ موردی منقضی، نزدیک به انقضا یا تمام‌شده نیست.",
    openCenter: "باز کردن مرکز اعلان‌ها",
  },
  page: {
    title: "اعلان‌ها",
    description:
      "هشدار برای موجودی‌هایی که منقضی شده‌اند، تا {days} روز دیگر منقضی می‌شوند، به حد هشدار رسیده‌اند یا به نقطهٔ صفر رسیده‌اند. پس از تأمین دوباره، تغییر تاریخ یا دور ریختن، خودبه‌خود برطرف می‌شوند.",
    active: "فعال",
    resolved: "برطرف‌شده",
    count: "{count} × {kind}",
    raised: "ایجاد: {when}",
    resolvedAt: "برطرف: {when}",
    noneResolved: "هنوز هشدار برطرف‌شده‌ای وجود ندارد.",
    allClear: "همه‌چیز مرتب است — هیچ موردی منقضی، نزدیک به انقضا یا تمام‌شده نیست.",
  },
};

const messages = { en, fa };
export default messages;
