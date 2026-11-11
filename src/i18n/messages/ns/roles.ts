const en = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  storage: "Storage manager",
  viewer: "Viewer",
  desc: {
    owner: "Full access, including members and record types",
    admin: "Full access, including members and record types",
    member: "Register and edit records, use stock, manage storage",
    storage: "Manage storage and stock, and handle biobank requests; no schema or member changes",
    viewer: "Read-only — can search and export, cannot change anything",
  },
};

const fa: typeof en = {
  owner: "مالک",
  admin: "مدیر",
  member: "عضو",
  storage: "مسئول انبار",
  viewer: "بیننده",
  desc: {
    owner: "دسترسی کامل، از جمله اعضا و انواع رکورد",
    admin: "دسترسی کامل، از جمله اعضا و انواع رکورد",
    member: "ثبت و ویرایش رکوردها، مصرف موجودی، مدیریت محل نگهداری",
    storage: "مدیریت محل نگهداری و موجودی و رسیدگی به درخواست‌های بیوبانک؛ بدون تغییر ساختار یا اعضا",
    viewer: "فقط خواندنی — امکان جستجو و خروجی گرفتن، بدون امکان تغییر",
  },
};

const messages = { en, fa };
export default messages;
