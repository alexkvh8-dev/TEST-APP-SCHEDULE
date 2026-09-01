/*
 * Content Security Policy.
 *
 * 'unsafe-inline' on script-src is unavoidable here: Next's App Router injects
 * inline bootstrap scripts, and the theme script has to run before first paint
 * or the wrong background flashes. Everything else is locked down — in
 * particular `connect-src` is limited to Supabase, so a script that did manage
 * to run could not post your data to somebody else's server, and
 * `frame-ancestors 'none'` means the app cannot be framed and clickjacked.
 */
const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

/*
 * Next's dev server compiles with eval-based source maps and React Fast
 * Refresh, so without this the whole app is inert under `next dev` — no click
 * handler runs. It is never sent in production, which is the build that
 * matters; the production bundle needs no eval at all.
 */
const devScript = process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'";

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline'${devScript}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  [
    "connect-src 'self'",
    // Falls back to the whole Supabase domain if the env var was missing at
    // build time. Slightly looser, but a CSP that blocks your own database
    // fails the app shut, and that is a worse outcome than a wildcard here.
    supabaseOrigin || "https://*.supabase.co",
    "https://api.exchangerate.host",
    "https://open.er-api.com",
  ].join(" "),
  "manifest-src 'self'",
  "worker-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Belt and braces with frame-ancestors, for older browsers.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Never leak the full URL of an app page to a third-party site.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The app asks for the mic and the camera itself; nothing else may.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // The version banner tells an attacker exactly which advisories to try.
  poweredByHeader: false,

  async rewrites() {
    return [
      {
        // Android looks for this exact path to verify an APK belongs to this
        // domain. A route handler serves it so the fingerprint is an env var
        // rather than a committed file.
        source: "/.well-known/assetlinks.json",
        destination: "/api/assetlinks",
      },
    ];
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        // Nothing under /api is ever cacheable — these are per-user responses
        // and a shared cache in front of them would serve one person's ledger
        // to another.
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
          { key: "X-Robots-Tag", value: "noindex" },
        ],
      },
    ];
  },
};

export default nextConfig;
