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

export async function GET() {
  const fingerprints = (process.env.ANDROID_CERT_FINGERPRINT ?? "")
    .split(",")
    .map((f) => f.trim().toUpperCase())
    .filter(Boolean);

  const packageName = process.env.ANDROID_PACKAGE_NAME?.trim();

  // No APK yet: return a valid, empty statement list rather than a 404, so
  // verification fails cleanly instead of looking like a broken server.
  if (!fingerprints.length || !packageName) {
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
          package_name: packageName,
          sha256_cert_fingerprints: fingerprints,
        },
      },
    ],
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
