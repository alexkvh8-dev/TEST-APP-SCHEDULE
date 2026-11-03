import React from "react";

import { C, UI } from "../lib/brand";
import type { Video } from "../data";
import { ThumbArt } from "./ThumbArt";

export const CARD = { w: 438, thumbH: 246, h: 352, radius: 12 };

/**
 * One feed item at desktop scale: 16:9 thumbnail with duration badge, avatar,
 * two-line title, channel and view count, laid out like YouTube's home grid.
 */
export function VideoCard({
  video,
  seed,
  t = 0,
  radius = CARD.radius,
  metaOpacity = 1,
  textOpacity = 1,
}: {
  video: Video;
  seed: number;
  t?: number;
  radius?: number;
  metaOpacity?: number;
  textOpacity?: number;
}) {
  const live = video.duration === "LIVE";
  return (
    <div style={{ width: CARD.w, fontFamily: UI }}>
      <div style={{ position: "relative", width: CARD.w, height: CARD.thumbH, borderRadius: radius, overflow: "hidden", background: C.surface }}>
        <ThumbArt kind={video.kind} seed={seed} t={t} textOpacity={textOpacity} />
        <div
          style={{
            position: "absolute",
            right: 8,
            bottom: 8,
            padding: "1px 5px",
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 500,
            lineHeight: "18px",
            color: "#fff",
            background: live ? C.red : "rgba(0,0,0,0.8)",
            opacity: metaOpacity,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {live && <span style={{ width: 6, height: 6, borderRadius: 3, background: "#fff" }} />}
          {video.duration}
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 12, opacity: metaOpacity }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            background: video.avatar,
            flexShrink: 0,
            color: "#fff",
            fontSize: 15,
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {video.channel[0]}
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              color: C.text,
              fontSize: 16,
              fontWeight: 500,
              lineHeight: "22px",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {video.title}
          </div>
          <div style={{ color: C.text2, fontSize: 14, lineHeight: "20px", marginTop: 4 }}>{video.channel}</div>
          <div style={{ color: C.text2, fontSize: 14, lineHeight: "20px" }}>{video.meta}</div>
        </div>
      </div>
    </div>
  );
}
