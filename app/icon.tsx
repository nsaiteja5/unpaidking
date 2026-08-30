import { ImageResponse } from "next/og";
export const size = { width: 64, height: 64 }; export const contentType = "image/png";
export default function Icon() { return new ImageResponse(<div style={{ alignItems: "center", background: "#e8dcc8", display: "flex", height: "100%", justifyContent: "center", width: "100%" }}><div style={{ background: "#9a2b1f", borderRadius: 99, display: "flex", height: 32, width: 32 }} /></div>, size); }
