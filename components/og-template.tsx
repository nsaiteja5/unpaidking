import { dollars } from "@/lib/format";
import type { ThroneView } from "@/lib/thrones";

export function OgTemplate({ throne }: { throne: ThroneView }) {
  const isDefault = throne.isDefault;
  const stamp = isDefault ? "DEFAULT" : "PAID";
  return (
    <div
      style={{
        background: "#14110e",
        color: "#e8dcc8",
        display: "flex",
        height: "100%",
        width: "100%",
        padding: "58px 70px",
        flexDirection: "column",
        fontFamily: "serif",
      }}
    >
      <div style={{ display: "flex", fontFamily: "sans-serif", fontSize: 24, fontWeight: 700, letterSpacing: 5 }}>
        UNPAID KING
      </div>
      <div
        style={{
          color: "#b7a890",
          display: "flex",
          fontFamily: "sans-serif",
          fontSize: 22,
          letterSpacing: 3,
          marginTop: 54,
          textTransform: "uppercase",
        }}
      >
        {throne.category}
      </div>
      <div style={{ display: "flex", fontSize: 92, letterSpacing: -5, marginTop: 16 }}>
        {throne.kingName}
      </div>
      <div
        style={{
          alignItems: "center",
          display: "flex",
          fontFamily: "sans-serif",
          fontSize: 25,
          gap: 18,
          marginTop: 28,
        }}
      >
        <span
          style={{
            border: "3px solid #9a2b1f",
            color: "#9a2b1f",
            fontWeight: 700,
            letterSpacing: 4,
            padding: "8px 10px",
          }}
        >
          {stamp}
        </span>
        <span style={{ color: isDefault ? "#e8dcc8" : "#c4a574" }}>
          {dollars(throne.stakeCents)}
        </span>
      </div>
      <div style={{ color: "#b7a890", display: "flex", fontFamily: "sans-serif", fontSize: 22, marginTop: "auto" }}>
        {isDefault ? `Steal for ${dollars(throne.stakeCents + 900)}` : `Took it from ${throne.lastFromName ?? throne.defaultKingName}`}
      </div>
      <div style={{ display: "flex", fontFamily: "sans-serif", fontSize: 19, marginTop: 14 }}>
        {isDefault ? "unpaidking.lol" : `unpaidking.lol/t/${throne.slug}`}
      </div>
    </div>
  );
}
