"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import type { ThroneView } from "@/lib/thrones";

type Props = {
  thrones: ThroneView[];
  activeSlug: string;
  onSelectThrone: (slug: string) => void;
  onStartNewThrone?: () => void;
};

export function ThroneDock({
  thrones,
  activeSlug,
  onSelectThrone,
  onStartNewThrone,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  // Drag state
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragScrollLeft = useRef(0);
  const dragMoved = useRef(false);
  const DRAG_THRESHOLD = 5; // px

  const filteredThrones = thrones.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const catMatch = t.category.toLowerCase().includes(q);
    const defMatch = t.definition?.toLowerCase().includes(q);
    const aliasMatch = t.aliases ? t.aliases.toLowerCase().includes(q) : false;
    const kingMatch = t.kingName.toLowerCase().includes(q);
    return catMatch || defMatch || aliasMatch || kingMatch;
  });

  // ── Update scroll-edge state ──────────────────────────────────────────────
  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState]);

  // Re-check after filtered list changes
  useEffect(() => {
    setTimeout(updateScrollState, 50);
  }, [filteredThrones.length, updateScrollState]);

  // ── Auto-scroll active chip into view ────────────────────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const activeBtn = el.querySelector<HTMLButtonElement>('[data-active="true"]');
    if (activeBtn) {
      const btnLeft = activeBtn.offsetLeft;
      const btnRight = btnLeft + activeBtn.offsetWidth;
      const viewLeft = el.scrollLeft;
      const viewRight = viewLeft + el.clientWidth;
      if (btnLeft < viewLeft + 16) {
        el.scrollTo({ left: btnLeft - 16, behavior: "smooth" });
      } else if (btnRight > viewRight - 16) {
        el.scrollTo({ left: btnRight - el.clientWidth + 16, behavior: "smooth" });
      }
    }
  }, [activeSlug]);

  // ── Arrow navigation ─────────────────────────────────────────────────────
  const scrollBy = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.7;
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  // ── Mouse wheel → horizontal scroll ──────────────────────────────────────
  const handleWheel = useCallback((e: WheelEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    // Only intercept vertical scrolling over the dock
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // already horizontal
    e.preventDefault();
    el.scrollBy({ left: e.deltaY * 2, behavior: "auto" });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // ── Mouse drag-to-scroll ─────────────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    isDragging.current = true;
    dragMoved.current = false;
    dragStartX.current = e.pageX - el.offsetLeft;
    dragScrollLeft.current = el.scrollLeft;
    el.style.cursor = "grabbing";
    el.style.userSelect = "none";
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    const el = scrollRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = x - dragStartX.current;
    if (Math.abs(walk) > DRAG_THRESHOLD) dragMoved.current = true;
    el.scrollLeft = dragScrollLeft.current - walk;
  };

  const endDrag = () => {
    const el = scrollRef.current;
    isDragging.current = false;
    if (el) {
      el.style.cursor = "";
      el.style.userSelect = "";
    }
  };

  // Wrap chip click to suppress if dragged
  const handleChipClick = (slug: string) => {
    if (dragMoved.current) return;
    onSelectThrone(slug);
  };

  return (
    <nav className="throne-dock-section" aria-label="Category Discovery">
      {/* Search & Action Bar */}
      <div className="dock-header-bar">
        <div className="search-wrap">
          <label htmlFor="throne-search" className="smallcaps search-label">
            Find a throne
          </label>
          <input
            id="throne-search"
            type="search"
            placeholder="Search category, product, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="dock-search-input"
          />
        </div>

        <div className="new-fight-cta">
          <span className="smallcaps new-fight-label">Don&apos;t see your fight?</span>
          <a
            href="/start"
            className="start-throne-link"
            onClick={(e) => {
              if (onStartNewThrone) {
                e.preventDefault();
                onStartNewThrone();
              }
            }}
          >
            + Start a new throne
          </a>
        </div>
      </div>

      {/* Horizontal Scroll with Arrow Buttons */}
      <div className="dock-scroll-wrapper">
        {/* Left Arrow */}
        <button
          type="button"
          className={`dock-nav-btn dock-nav-prev ${canScrollLeft ? "is-visible" : ""}`}
          onClick={() => scrollBy("left")}
          aria-label="Scroll thrones left"
          tabIndex={canScrollLeft ? 0 : -1}
        >
          ‹
        </button>

        {/* Left fade edge */}
        <div className={`dock-edge-fade dock-edge-left ${canScrollLeft ? "is-visible" : ""}`} />

        <div
          className="dock-scroll-container"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
        >
          <div
            ref={scrollRef}
            className="dock-scroll"
            role="tablist"
            aria-label="Throne categories"
          >
            {filteredThrones.map((throne) => (
              <button
                key={throne.id}
                className={`dock-item ${activeSlug === throne.slug ? "is-active" : ""}`}
                data-active={activeSlug === throne.slug ? "true" : "false"}
                type="button"
                role="tab"
                aria-selected={activeSlug === throne.slug}
                onClick={() => handleChipClick(throne.slug)}
              >
                <span className="dock-item-name">{throne.category}</span>
                <span className="dock-item-king">({throne.kingName})</span>
              </button>
            ))}
            {filteredThrones.length === 0 && (
              <p className="no-thrones-found">
                No throne by that name.{" "}
                <a href="/start" className="ink-link">
                  Start a new throne →
                </a>
              </p>
            )}
          </div>
        </div>

        {/* Right fade edge */}
        <div className={`dock-edge-fade dock-edge-right ${canScrollRight ? "is-visible" : ""}`} />

        {/* Right Arrow */}
        <button
          type="button"
          className={`dock-nav-btn dock-nav-next ${canScrollRight ? "is-visible" : ""}`}
          onClick={() => scrollBy("right")}
          aria-label="Scroll thrones right"
          tabIndex={canScrollRight ? 0 : -1}
        >
          ›
        </button>
      </div>
    </nav>
  );
}
