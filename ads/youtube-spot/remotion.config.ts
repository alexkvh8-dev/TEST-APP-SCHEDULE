import { Config } from "@remotion/cli/config";

// The sandbox ships Chromium's headless shell; point Remotion at it instead of
// letting it download its own copy. Override with REMOTION_BROWSER if needed.
Config.setBrowserExecutable(
  process.env.REMOTION_BROWSER ??
    "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell",
);
Config.setVideoImageFormat("png");
Config.setPixelFormat("yuv420p");
Config.setCodec("h264");
Config.setCrf(12);
Config.setColorSpace("bt709");
Config.setConcurrency(4);
Config.setOverwriteOutput(true);
