import { dollars } from "@/lib/format";
export function StealButton({ stakeCents, href, className = "" }: { stakeCents: number; href: string; className?: string }) { return <a className={`steal-button ${className}`} href={href}><span>Steal for {dollars(stakeCents + 900)}</span><span className="steal-arrow" aria-hidden="true">→</span></a>; }
