"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
export function LiveRefresh({ slug, version }: { slug: string; version: string }) { const router = useRouter(); const latest = useRef(version); useEffect(() => { const timer = window.setInterval(async () => { try { const response = await fetch(`/api/thrones/${slug}`, { cache: "no-store" }); const data = await response.json(); if (response.ok && data.version !== latest.current) { latest.current = data.version; const stage = document.querySelector(".throne-room-stage"); stage?.classList.add("throne-flash"); window.setTimeout(() => router.refresh(), 180); } } catch { /* Keep the current reign visible. */ } }, 3000); return () => window.clearInterval(timer); }, [router, slug]); return null; }
