// One namespace per area of the app; each ns file keeps English and Persian side by side.
import type { Messages } from "./en";
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

export const fa: Messages = {
  alerts: alerts.fa,
  assistant: assistant.fa,
  audit: audit.fa,
  auth: auth.fa,
  biobank: biobank.fa,
  common: common.fa,
  dashboard: dashboard.fa,
  errors: errors.fa,
  inventory: inventory.fa,
  misc: misc.fa,
  nav: nav.fa,
  purchasing: purchasing.fa,
  record: record.fa,
  registry: registry.fa,
  roles: roles.fa,
  settings: settings.fa,
  storage: storage.fa,
};
