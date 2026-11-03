/**
 * Design tokens. Shots import from here and never hard-code colours or faces.
 *
 * - red: YouTube red as listed by Simple Icons, which cites YouTube's own
 *   brand-resources page. brand.youtube itself was unreachable from the build
 *   sandbox, so this is the one value with a cited source.
 * - The dark-theme UI greys are approximations of YouTube's dark theme, used
 *   only for the recreated interface, never for the logo.
 */
export const C = {
  red: "#FF0000",
  white: "#FFFFFF",
  /** Wordmark grey on light backgrounds (from the CC0 logo file). */
  wordmarkInk: "#282828",

  bg: "#0F0F0F",
  bgLift: "#1A1A1A",
  surface: "#212121",
  chip: "#272727",
  chipHover: "#3F3F3F",
  field: "#121212",
  fieldBorder: "#303030",
  button: "#222222",
  text: "#F1F1F1",
  text2: "#AAAAAA",
  text3: "#717171",
  scrim: "rgba(15,15,15,0.86)",
};

/** UI face: Roboto, YouTube's interface typeface (Apache 2.0). */
export const UI = "'Roboto', 'Roboto Flex', sans-serif";

/**
 * Display face: YouTube Sans is proprietary, so headlines use Roboto Flex
 * pushed heavy and slightly condensed, the same family YouTube's UI uses.
 */
export const DISPLAY = "'Roboto Flex', 'Roboto', sans-serif";
export const displayAxes = (wght = 860, wdth = 82, opsz = 144) =>
  `"wght" ${wght}, "wdth" ${wdth}, "opsz" ${opsz}, "GRAD" 0`;

/** Shared type scale at 1080p. */
export const TYPE = {
  hero: 196,
  head: 132,
  sub: 52,
  micro: 22,
};
