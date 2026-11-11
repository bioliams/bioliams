"use client";

import { createContext, useContext, useMemo } from "react";
import { Direction } from "radix-ui";
import { dirOf, type Locale } from "./config";
import { createT, type T } from "./translate";
import { getMessages } from "./messages";

const I18nContext = createContext<T | null>(null);

/**
 * Gives client components the visitor's language, and tells Radix menus,
 * dialogs and sheets which way the page reads so they open on the right side.
 */
export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const t = useMemo(() => createT(locale, getMessages(locale)), [locale]);
  return (
    <I18nContext.Provider value={t}>
      <Direction.Provider dir={dirOf(locale)}>{children}</Direction.Provider>
    </I18nContext.Provider>
  );
}

export function useT(): T {
  const t = useContext(I18nContext);
  if (!t) throw new Error("useT must be used inside I18nProvider");
  return t;
}
