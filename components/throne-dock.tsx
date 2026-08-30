"use client";
import { useState } from "react";
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

  const filteredThrones = thrones.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const catMatch = t.category.toLowerCase().includes(q);
    const defMatch = t.definition?.toLowerCase().includes(q);
    const aliasMatch = t.aliases ? t.aliases.toLowerCase().includes(q) : false;
    const kingMatch = t.kingName.toLowerCase().includes(q);
    return catMatch || defMatch || aliasMatch || kingMatch;
  });

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
          <span className="smallcaps new-fight-label">Don’t see your fight?</span>
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

      {/* Horizontal Scroll / Category Tabs */}
      <div className="dock-scroll-container">
        <div className="dock-scroll" role="tablist" aria-label="Throne categories">
          {filteredThrones.map((throne) => (
            <button
              key={throne.id}
              className={`dock-item ${activeSlug === throne.slug ? "is-active" : ""}`}
              type="button"
              role="tab"
              aria-selected={activeSlug === throne.slug}
              onClick={() => onSelectThrone(throne.slug)}
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
    </nav>
  );
}
