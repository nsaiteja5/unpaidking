export function Stamp({ status, label }: { status: "default" | "stolen" | "paid"; label?: string }) {
  return <span className={`stamp stamp-${status}`}>{label ?? (status === "default" ? "DEFAULT" : status === "stolen" ? "STOLEN" : "PAID")}</span>;
}
