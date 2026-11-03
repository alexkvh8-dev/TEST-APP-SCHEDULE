import React from "react";

import { C, UI } from "../lib/brand";
import { Icon, P } from "./icons";

/** Intrinsic desktop size of the search cluster (input + button + mic). */
export const SEARCH = { inputW: 536, buttonW: 64, gap: 12, micW: 40, h: 40 };
export const SEARCH_W = SEARCH.inputW + SEARCH.buttonW + SEARCH.gap + SEARCH.micW;

/**
 * YouTube's search cluster. The text area is a render prop so the opening
 * shot can put a spinning slot word inside the real field.
 */
export function SearchBar({
  children,
  inputScaleX = 1,
  pressed = 0,
  focus = 0,
}: {
  children?: React.ReactNode;
  /** 0..1 width of the input while it unfolds. */
  inputScaleX?: number;
  /** 0..1 press amount on the search button. */
  pressed?: number;
  /** 0..1 blue focus ring, as when the field is active. */
  focus?: number;
}) {
  const inputW = SEARCH.inputW * inputScaleX;
  return (
    <div style={{ display: "flex", alignItems: "center", height: SEARCH.h, fontFamily: UI, width: SEARCH_W, justifyContent: "flex-end" }}>
      <div
        style={{
          position: "relative",
          width: inputW,
          height: SEARCH.h,
          borderRadius: "40px 0 0 40px",
          background: C.field,
          border: `1px solid ${focus > 0 ? `rgba(28,98,185,${focus})` : C.fieldBorder}`,
          borderRight: "none",
          boxSizing: "border-box",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          paddingLeft: 16,
        }}
      >
        {children}
      </div>
      <div
        style={{
          width: SEARCH.buttonW,
          height: SEARCH.h,
          borderRadius: "0 40px 40px 0",
          background: pressed > 0 ? `rgb(${34 + 30 * pressed},${34 + 30 * pressed},${34 + 30 * pressed})` : C.button,
          border: `1px solid ${C.fieldBorder}`,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: C.text,
        }}
      >
        <Icon d={P.search} size={24} style={{ transform: `scale(${1 - pressed * 0.12})` }} />
      </div>
      <div style={{ width: SEARCH.gap }} />
      <div
        style={{
          width: SEARCH.micW,
          height: SEARCH.micW,
          borderRadius: 20,
          background: "#181818",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: C.text,
        }}
      >
        <Icon d={P.mic} size={22} />
      </div>
    </div>
  );
}
