const localAdminOrigins = [
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3003",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:3002",
  "http://127.0.0.1:3003",
];

export function parseTrustedOrigins(originConfig: string) {
  const configuredOrigins = originConfig
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const shouldAddLocalAdminOrigins = configuredOrigins.some((origin) =>
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin),
  );

  return Array.from(
    new Set([...configuredOrigins, ...(shouldAddLocalAdminOrigins ? localAdminOrigins : [])]),
  );
}
