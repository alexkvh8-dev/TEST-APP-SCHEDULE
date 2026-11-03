import { loadFont } from "@remotion/fonts";
import { continueRender, delayRender, staticFile } from "remotion";

let started = false;

/**
 * Loads the faces once, holding the render until they are ready, so no frame
 * is ever drawn with a fallback font.
 */
export function ensureFonts() {
  if (started) return;
  started = true;
  const handle = delayRender("fonts");
  Promise.all([
    loadFont({ family: "Roboto", url: staticFile("fonts/roboto-latin-400-normal.woff2"), weight: "400" }),
    loadFont({ family: "Roboto", url: staticFile("fonts/roboto-latin-500-normal.woff2"), weight: "500" }),
    loadFont({ family: "Roboto", url: staticFile("fonts/roboto-latin-700-normal.woff2"), weight: "700" }),
    loadFont({
      family: "Roboto Flex",
      url: staticFile("fonts/roboto-flex-latin-full-normal.woff2"),
      weight: "100 1000",
      stretch: "25% 151%",
    }),
  ])
    .then(() => continueRender(handle))
    .catch((err) => {
      console.error(err);
      continueRender(handle);
    });
}
