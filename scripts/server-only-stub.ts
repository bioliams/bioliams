// `server-only` throws outside a React Server Component context. CLI scripts run
// on the server by definition, so they alias the package to this no-op via
// scripts/tsconfig.json. The real guard stays in place for the app build.
export {};
