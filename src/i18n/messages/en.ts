// One namespace per area of the app; each ns file keeps English and Persian side by side.
import alerts from "./ns/alerts";
import assistant from "./ns/assistant";
import audit from "./ns/audit";
import auth from "./ns/auth";
import biobank from "./ns/biobank";
import common from "./ns/common";
import dashboard from "./ns/dashboard";
import errors from "./ns/errors";
import inventory from "./ns/inventory";
import misc from "./ns/misc";
import nav from "./ns/nav";
import purchasing from "./ns/purchasing";
import record from "./ns/record";
import registry from "./ns/registry";
import roles from "./ns/roles";
import settings from "./ns/settings";
import storage from "./ns/storage";

export const en = {
  alerts: alerts.en,
  assistant: assistant.en,
  audit: audit.en,
  auth: auth.en,
  biobank: biobank.en,
  common: common.en,
  dashboard: dashboard.en,
  errors: errors.en,
  inventory: inventory.en,
  misc: misc.en,
  nav: nav.en,
  purchasing: purchasing.en,
  record: record.en,
  registry: registry.en,
  roles: roles.en,
  settings: settings.en,
  storage: storage.en,
};

export type Messages = typeof en;
