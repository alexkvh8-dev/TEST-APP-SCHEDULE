import { NextResponse } from "next/server";

/**
 * Digital Asset Links, served at /.well-known/assetlinks.json via a rewrite.
 *
 * An Android APK built from this PWA (a Trusted Web Activity, e.g. from
 * PWABuilder or Bubblewrap) shows a Chrome-branded URL bar across the top
 * until Android can verify that the APK and this domain belong to the same
 * owner. This file is that proof.
 *
 * Set ANDROID_CERT_FINGERPRINT to the SHA-256 signing fingerprint of the APK
 * (the build tool prints it; it looks like AA:BB:CC:...). Multiple fingerprints
 * can be comma-separated — useful when Play App Signing re-signs your upload.
 */
export const dynamic = "force-dynamic";

/**
 * A SHA-256 fingerprint is exactly 32 bytes, printed as colon-separated hex —
 * 95 characters. Anything else is a typo or, more often, a placeholder pasted
 * out of a set-up guide.
 */
const FINGERPRINT = /^[0-9A-F]{2}(:[0-9A-F]{2}){31}$/;

/** Reverse-DNS-ish: dot-separated segments, each starting with a letter. */
const PACKAGE_NAME = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/;

export async function GET() {
  const fingerprints = (process.env.ANDROID_CERT_FINGERPRINT ?? "")
    .split(",")
    .map((f) => f.trim().toUpperCase())
    // Serving a malformed value is worse than serving none: Google reports
    // ERROR_CODE_MALFORMED_CONTENT for the whole file, which reads like the
    // server is broken rather than like one env var is wrong.
    .filter((f) => FINGERPRINT.test(f));

  const packageName = process.env.ANDROID_PACKAGE_NAME?.trim();
  const validPackage = packageName && PACKAGE_NAME.test(packageName) ? packageName : null;

  // Not configured, or configured wrongly: a valid empty statement list. The
  // app just keeps its URL bar, which is a visible, self-explaining failure.
  if (!fingerprints.length || !validPackage) {
    return NextResponse.json([], {
      headers: { "Cache-Control": "public, max-age=300" },
    });
  }

  return NextResponse.json(
    [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: validPackage,
          sha256_cert_fingerprints: fingerprints,
        },
      },
    ],
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
