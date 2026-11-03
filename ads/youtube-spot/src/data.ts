import type { Kind } from "./components/ThumbArt";

/** Fictional videos and channels: invented for the spec, none are real. */
export interface Video {
  kind: Kind;
  title: string;
  channel: string;
  meta: string;
  duration: string;
  avatar: string;
}

export const VIDEOS: Record<Kind, Video> = {
  cook: { kind: "cook", title: "15-minute pasta that tastes like a restaurant", channel: "Nonna's Kitchen", meta: "2.1M views • 3 days ago", duration: "15:42", avatar: "#E85D04" },
  skate: { kind: "skate", title: "Learning a kickflip in 7 days (day 1 → 7)", channel: "Concrete Wave", meta: "864K views • 1 week ago", duration: "11:08", avatar: "#3A86FF" },
  code: { kind: "code", title: "Build a whole app in 10 minutes", channel: "Tiny Dev Lab", meta: "1.4M views • 2 weeks ago", duration: "10:31", avatar: "#8338EC" },
  music: { kind: "music", title: "One-take acoustic session at sunrise", channel: "Harbor Lights", meta: "3.3M views • 1 month ago", duration: "4:27", avatar: "#FF006E" },
  draw: { kind: "draw", title: "Draw anything with three simple shapes", channel: "Sketch Club", meta: "702K views • 5 days ago", duration: "8:55", avatar: "#FB5607" },
  fix: { kind: "fix", title: "Fix a flat bike tyre in 5 minutes", channel: "Spoke & Wrench", meta: "391K views • 4 days ago", duration: "5:12", avatar: "#2A9D8F" },
  dance: { kind: "dance", title: "Learn this dance in 60 seconds", channel: "Move Lab", meta: "5.8M views • 2 days ago", duration: "1:00", avatar: "#F72585" },
  bake: { kind: "bake", title: "The easiest sourdough you'll ever make", channel: "Crumb Theory", meta: "1.9M views • 3 weeks ago", duration: "18:20", avatar: "#BC6C25" },
  fly: { kind: "fly", title: "We folded a paper plane that flew 50 m", channel: "Fold Physics", meta: "2.7M views • 6 days ago", duration: "13:47", avatar: "#0077B6" },
  travel: { kind: "travel", title: "48 hours in the Alps with one backpack", channel: "Northbound", meta: "1.1M views • 1 month ago", duration: "22:16", avatar: "#3D405B" },
  space: { kind: "space", title: "How big is the universe, really?", channel: "Deep Field", meta: "6.4M views • 8 months ago", duration: "16:03", avatar: "#7209B7" },
  game: { kind: "game", title: "Speedrun world record attempt", channel: "Pixel Sprint", meta: "912K views • 1 day ago", duration: "41:09", avatar: "#00B4D8" },
  fitness: { kind: "fitness", title: "30-day push-up challenge: the results", channel: "Rep Count", meta: "1.3M views • 2 weeks ago", duration: "12:30", avatar: "#FFB703" },
  podcast: { kind: "podcast", title: "Why we keep starting new hobbies | Ep. 142", channel: "Curious Minds", meta: "488K views • 5 days ago", duration: "1:12:44", avatar: "#0F766E" },
  live: { kind: "live", title: "Live from the main stage", channel: "Festival Live", meta: "24K watching", duration: "LIVE", avatar: "#F72585" },
  build: { kind: "build", title: "I built a tiny house in 30 days", channel: "Maple & Moss", meta: "4.2M views • 2 weeks ago", duration: "12:08", avatar: "#2D6A4F" },
};

/** Feed order. The hero ("build") is placed separately by the feed shot. */
export const FEED_KINDS: Kind[] = [
  "cook", "music", "space", "skate", "code", "live", "bake", "travel",
  "dance", "game", "fix", "podcast", "fly", "fitness", "draw",
];

/** The slot words in the opening search, each with the art that flashes behind it. */
export const SLOT: { word: string; kind: Kind }[] = [
  { word: "cook", kind: "cook" },
  { word: "skate", kind: "skate" },
  { word: "code", kind: "code" },
  { word: "sing", kind: "music" },
  { word: "draw", kind: "draw" },
  { word: "fix a bike", kind: "fix" },
  { word: "dance", kind: "dance" },
  { word: "bake bread", kind: "bake" },
  { word: "fly", kind: "fly" },
  { word: "anything", kind: "travel" },
];

export const CHIPS = ["All", "Music", "Gaming", "Live", "Podcasts", "Cooking", "Skateboarding", "Science", "Travel", "Comedy", "Recently uploaded", "Watched", "New to you"];
