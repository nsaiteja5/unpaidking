"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { ThroneStage } from "@/components/throne-stage";
import { ThroneDock } from "@/components/throne-dock";
import { TakeoverBuilder } from "@/components/takeover-builder";
import { ViewTracker } from "@/components/view-tracker";
import type { ThroneView } from "@/lib/thrones";
import type { SessionUser } from "@/lib/auth";

const ROTATION_INTERVAL = 5000;
const CROSSFADE_MS = 250;
const POLL_INTERVAL = 5000;

export function GazetteThrones({ thrones }: { thrones: ThroneView[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedForTakeover, setSelectedForTakeover] = useState<ThroneView | null>(null);
  const [paused, setPaused] = useState(false);
  const [userPinned, setUserPinned] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [liveThrones, setLiveThrones] = useState(thrones);
  const [isClaimFlash, setIsClaimFlash] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prefersReducedMotion = useRef(false);

  const active = liveThrones[activeIndex] ?? liveThrones[0];
  if (!active) return null;

  // Fetch current user on mount
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => { if (d?.user) setCurrentUser(d.user); })
      .catch(() => {});
  }, []);

  // Detect reduced motion preference
  useEffect(() => {
    if (typeof window !== "undefined") {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      prefersReducedMotion.current = mq.matches;
      const handler = (e: MediaQueryListEvent) => {
        prefersReducedMotion.current = e.matches;
        if (e.matches) setPaused(true);
      };
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, []);

  // Auto-advance rotation
  const advanceToNext = useCallback(() => {
    if (prefersReducedMotion.current) return;
    setTransitioning(true);
    setTimeout(() => {
      setActiveIndex((prev) => (prev + 1) % liveThrones.length);
      setTransitioning(false);
    }, CROSSFADE_MS);
  }, [liveThrones.length]);

  useEffect(() => {
    if (paused || userPinned || selectedForTakeover || liveThrones.length <= 1) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(advanceToNext, ROTATION_INTERVAL);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused, userPinned, selectedForTakeover, advanceToNext, liveThrones.length]);

  // Live polling for visible throne
  useEffect(() => {
    if (!active) return;
    const poll = async () => {
      try {
        const res = await fetch(`/api/thrones/${active.slug}`);
        if (!res.ok) return;
        const data = await res.json();

        setLiveThrones((prev) => {
          const idx = prev.findIndex((t) => t.slug === active.slug);
          if (idx === -1) return prev;

          const old = prev[idx];
          // Check if king changed (claim flash)
          if (data.kingName !== old.kingName) {
            setIsClaimFlash(true);
            setTimeout(() => setIsClaimFlash(false), 180);
          }

          const updated = {
            ...old,
            kingName: data.kingName ?? old.kingName,
            kingUrl: data.kingUrl ?? old.kingUrl,
            stakeCents: data.stakeCents ?? old.stakeCents,
            isDefault: data.isDefault ?? old.isDefault,
            visits7d: data.visits7d ?? old.visits7d,
            clicks7d: data.clicks7d ?? old.clicks7d,
            currentReign: data.currentReign ?? old.currentReign,
          };
          const next = [...prev];
          next[idx] = updated as ThroneView;
          return next;
        });
      } catch {}
    };

    pollRef.current = setInterval(poll, POLL_INTERVAL);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [active?.slug]);

  // Pause helpers
  const handleStageMouseEnter = () => setPaused(true);
  const handleStageMouseLeave = () => { if (!userPinned) setPaused(false); };
  const handleStageFocus = () => setPaused(true);
  const handleStageBlur = (e: React.FocusEvent) => {
    if (stageRef.current && !stageRef.current.contains(e.relatedTarget as Node)) {
      if (!userPinned) setPaused(false);
    }
  };
  const handleStageTouchStart = () => {
    setPaused(true);
    setUserPinned(true);
  };

  const handleChipSelect = (slug: string) => {
    const idx = liveThrones.findIndex((t) => t.slug === slug);
    if (idx !== -1) {
      setTransitioning(true);
      setTimeout(() => {
        setActiveIndex(idx);
        setTransitioning(false);
      }, CROSSFADE_MS);
    }
    setUserPinned(true);
    setPaused(true);
  };

  const handleResume = () => {
    setUserPinned(false);
    setPaused(false);
  };

  return (
    <>
      <ViewTracker type="throne_view" slug={active.slug} />

      <section className="throne-room" aria-label="Throne Room">
        <div
          ref={stageRef}
          className={`throne-rotator-wrap ${transitioning ? "is-transitioning" : ""}`}
          onMouseEnter={handleStageMouseEnter}
          onMouseLeave={handleStageMouseLeave}
          onFocus={handleStageFocus}
          onBlur={handleStageBlur}
          onTouchStart={handleStageTouchStart}
        >
          <ThroneStage
            throne={active}
            currentUser={currentUser}
            onDethrone={() => setSelectedForTakeover(active)}
            isClaimingFlash={isClaimFlash}
          />
        </div>

        {/* Pause / Resume control */}
        {userPinned && liveThrones.length > 1 && (
          <div className="rotation-control">
            <span className="rotation-status">Paused</span>
            <button
              type="button"
              className="rotation-resume-btn"
              onClick={handleResume}
            >
              Resume
            </button>
          </div>
        )}

        <ThroneDock
          thrones={liveThrones}
          activeSlug={active.slug}
          onSelectThrone={handleChipSelect}
        />
      </section>

      {/* Takeover Builder Modal */}
      {selectedForTakeover && (
        <div
          className="steal-modal"
          role="dialog"
          aria-modal="true"
          aria-label={`Takeover builder for ${selectedForTakeover.category}`}
          onMouseDown={() => setSelectedForTakeover(null)}
        >
          <div className="modal-sheet" onMouseDown={(e) => e.stopPropagation()}>
            <TakeoverBuilder
              slug={selectedForTakeover.slug}
              category={selectedForTakeover.category}
              currentKing={selectedForTakeover.kingName}
              stakeCents={selectedForTakeover.stakeCents}
              currentUser={currentUser}
              onClose={() => setSelectedForTakeover(null)}
            />
          </div>
        </div>
      )}
    </>
  );
}
