"use client";
import { useState, useMemo } from "react";
import { dollars } from "@/lib/format";
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

  // Alphabetical sort (A-Z) by category name
  const sortedThrones = useMemo(() => {
    return [...thrones].sort((a, b) => a.category.localeCompare(b.category));
  }, [thrones]);

  // Real-time search filter
  const filteredThrones = useMemo(() => {
    if (!searchQuery.trim()) return sortedThrones;
    const q = searchQuery.toLowerCase().trim();
    return sortedThrones.filter((t) => {
      const catMatch = t.category.toLowerCase().includes(q);
      const defMatch = t.definition?.toLowerCase().includes(q);
      const aliasMatch = t.aliases ? t.aliases.toLowerCase().includes(q) : false;
      const kingMatch = t.kingName.toLowerCase().includes(q);
      return catMatch || defMatch || aliasMatch || kingMatch;
    });
  }, [sortedThrones, searchQuery]);

  const handleCardClick = (slug: string) => {
    onSelectThrone(slug);
    if (typeof window !== "undefined") {
      const stageEl = document.querySelector(".throne-room-stage");
      if (stageEl) {
        stageEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  return (
    <nav className="throne-dock-section" aria-label="Category Discovery">
      {/* Search & Action Bar */}
      <div className="dock-header-bar">
        <div className="search-wrap">
          <div className="search-input-box">
            <label htmlFor="throne-search" className="smallcaps search-label">
              Find a throne
            </label>
            <div className="search-input-inner">
              <input
                id="throne-search"
                type="search"
                placeholder="Search 30 categories, kings, or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="dock-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="search-clear-btn"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          <span className="search-count-pill">
            {filteredThrones.length} {filteredThrones.length === 1 ? "throne" : "thrones"}
          </span>
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

      {/* Alphabetical Grid of Thrones */}
      <div className="throne-grid" role="tablist" aria-label="All Thrones">
        {filteredThrones.map((throne) => {
          const isActive = activeSlug === throne.slug;
          const isDefault =
            throne.isDefault ||
            (throne.stakeCents === 0 && throne.kingName === throne.defaultKingName);
          const stakeDisplay = isDefault
            ? "UNPAID · $0"
            : `PAID · ${dollars(throne.stakeCents)}`;

          return (
            <button
              key={throne.id || throne.slug}
              type="button"
              role="tab"
              aria-selected={isActive}
              data-active={isActive ? "true" : "false"}
              className={`throne-grid-card ${isActive ? "is-active" : ""} ${
                isDefault ? "is-default" : "is-paid"
              }`}
              onClick={() => handleCardClick(throne.slug)}
            >
              <div className="grid-card-top">
                <span className="grid-card-category">{throne.category}</span>
                {isActive && (
                  <span className="grid-card-active-dot" title="Currently on stage" />
                )}
              </div>

              <div className="grid-card-body">
                <p className="grid-card-king">
                  <span className="grid-card-king-label">King:</span>{" "}
                  <strong className="grid-card-king-name">{throne.kingName}</strong>
                </p>
              </div>

              <div className="grid-card-bottom">
                <span
                  className={`grid-card-stake ${
                    isDefault ? "stake-unpaid" : "stake-paid"
                  }`}
                >
                  {stakeDisplay}
                </span>
                <span className="grid-card-view-btn" aria-hidden="true">
                  {isActive ? "VIEWING" : "VIEW →"}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {filteredThrones.length === 0 && (
        <div className="no-thrones-found">
          <p>No throne found matching &ldquo;{searchQuery}&rdquo;</p>
          <a href="/start" className="ink-link">
            Start a new throne for this category →
          </a>
        </div>
      )}
    </nav>
  );
}
