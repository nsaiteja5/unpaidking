"use client";
import { useState, useEffect } from "react";
import { dollars } from "@/lib/format";

type Props = {
  loggedIn: boolean;
};

type TabType = "dashboard" | "thrones" | "reigns" | "products" | "reports" | "logs";

export function AdminPanel({ loggedIn }: Props) {
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [notice, setNotice] = useState<{ msg: string; type: "info" | "error" | "success" } | null>(null);
  const [loading, setLoading] = useState(false);

  // Data states
  const [data, setData] = useState<{
    stats?: any;
    thrones: any[];
    reigns: any[];
    products: any[];
    reports: any[];
    logs: any[];
  }>({
    thrones: [],
    reigns: [],
    products: [],
    reports: [],
    logs: [],
  });

  // Filters
  const [throneSearch, setThroneSearch] = useState("");
  const [reignSearch, setReignSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");

  // Modals & Active Edit Forms
  const [modalState, setModalState] = useState<{
    type: "create_throne" | "edit_throne" | "force_king" | "merge_throne" | "edit_reign" | "block_entity" | "delete_reign" | null;
    target?: any;
  }>({ type: null });

  const loadData = async () => {
    if (!loggedIn) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "get_dashboard_data" }),
      });
      if (res.ok) {
        const payload = await res.json();
        setData({
          stats: payload.stats,
          thrones: payload.thrones || [],
          reigns: payload.reigns || [],
          products: payload.products || [],
          reports: payload.reports || [],
          logs: payload.logs || [],
        });
      }
    } catch {
      setNotice({ msg: "Failed to load admin data.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loggedIn) {
      loadData();
    }
  }, [loggedIn]);

  const sendAction = async (body: any, successMsg = "Action executed successfully.") => {
    setLoading(true);
    setNotice({ msg: "Executing...", type: "info" });
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (res.ok && result.ok) {
        setNotice({ msg: successMsg, type: "success" });
        setModalState({ type: null });
        await loadData();
      } else {
        setNotice({ msg: result.error || "Action failed.", type: "error" });
      }
    } catch {
      setNotice({ msg: "Network error occurred.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    window.location.reload();
  };

  // Login Screen
  if (!loggedIn) {
    return (
      <section className="prose-page" style={{ margin: "40px auto" }}>
        <h1 className="display" style={{ fontSize: "2rem", marginBottom: "16px" }}>Court Administration</h1>
        <form
          className="admin-form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            sendAction({ action: "login", password }, "Logged in successfully.");
          }}
        >
          <label>
            ADMIN_PASSWORD
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter court admin key..."
              required
              autoFocus
            />
          </label>
          <button className="dethrone-button" type="submit" disabled={loading} style={{ width: "100%" }}>
            {loading ? "Authenticating..." : "Unlock Control Panel"}
          </button>
          {notice && <p className="form-error">{notice.msg}</p>}
        </form>
      </section>
    );
  }

  // Filtered lists
  const filteredThrones = data.thrones.filter((t) => {
    if (!throneSearch.trim()) return true;
    const q = throneSearch.toLowerCase();
    return (
      t.category.toLowerCase().includes(q) ||
      t.slug.toLowerCase().includes(q) ||
      t.kingName.toLowerCase().includes(q)
    );
  });

  const filteredReigns = data.reigns.filter((r) => {
    if (!reignSearch.trim()) return true;
    const q = reignSearch.toLowerCase();
    return (
      r.kingName.toLowerCase().includes(q) ||
      r.publicId.toLowerCase().includes(q) ||
      (r.category && r.category.toLowerCase().includes(q)) ||
      (r.offerHeadline && r.offerHeadline.toLowerCase().includes(q))
    );
  });

  const filteredProducts = data.products.filter((p) => {
    if (!productSearch.trim()) return true;
    const q = productSearch.toLowerCase();
    return (
      p.domain.toLowerCase().includes(q) ||
      p.displayName.toLowerCase().includes(q) ||
      (p.xHandle && p.xHandle.toLowerCase().includes(q))
    );
  });

  return (
    <article className="admin-layout" aria-label="Court Control Panel">
      {/* Top Header */}
      <header className="admin-top-bar">
        <div className="admin-title-area">
          <h1 className="display">Court Administration</h1>
          <p className="admin-subtitle">Full operator control panel for thrones, campaigns, and moderation.</p>
        </div>

        <div className="admin-top-actions">
          <button
            type="button"
            className="admin-btn admin-btn-gold"
            onClick={() => sendAction({ action: "repair" }, "Starter thrones seeded/repaired.")}
            disabled={loading}
          >
            Re-seed Starters
          </button>
          <button
            type="button"
            className="admin-btn"
            onClick={() => loadData()}
            disabled={loading}
          >
            ↻ Refresh
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-danger"
            onClick={handleLogout}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Notice Banner */}
      {notice && (
        <div className="admin-notice">
          <span>{notice.msg}</span>
          <button
            type="button"
            style={{ background: "transparent", border: 0, color: "inherit", cursor: "pointer" }}
            onClick={() => setNotice(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <nav className="admin-nav-tabs" role="tablist">
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === "dashboard" ? "is-active" : ""}`}
          onClick={() => setActiveTab("dashboard")}
        >
          Dashboard ({data.stats?.counts?.liveThrones ?? data.thrones.length})
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === "thrones" ? "is-active" : ""}`}
          onClick={() => setActiveTab("thrones")}
        >
          Thrones ({data.thrones.length})
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === "reigns" ? "is-active" : ""}`}
          onClick={() => setActiveTab("reigns")}
        >
          Campaigns / Reigns ({data.reigns.length})
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === "products" ? "is-active" : ""}`}
          onClick={() => setActiveTab("products")}
        >
          Products & Domains ({data.products.length})
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === "reports" ? "is-active" : ""}`}
          onClick={() => setActiveTab("reports")}
        >
          Reports ({data.reports.filter((r) => r.status === "pending").length})
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === "logs" ? "is-active" : ""}`}
          onClick={() => setActiveTab("logs")}
        >
          Audit Logs
        </button>
      </nav>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: DASHBOARD                                              */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "dashboard" && (
        <section>
          {/* Quick Metrics */}
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <p className="admin-stat-label">Live Thrones</p>
              <p className="admin-stat-value">{data.stats?.counts?.liveThrones ?? 0}</p>
              <p className="admin-stat-sub">Active public thrones</p>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-label">Paid Reigns</p>
              <p className="admin-stat-value">{data.stats?.counts?.currentPaidReigns ?? 0}</p>
              <p className="admin-stat-sub">Challengers sitting paid</p>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-label">Unpaid Defaults</p>
              <p className="admin-stat-value">{data.stats?.counts?.unpaidDefaults ?? 0}</p>
              <p className="admin-stat-sub">Seeded $0 incumbents</p>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-label">Visits (7d)</p>
              <p className="admin-stat-value">{data.stats?.counts?.visits7d ?? 0}</p>
              <p className="admin-stat-sub">Deduped unique views</p>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-label">Clicks Sent (7d)</p>
              <p className="admin-stat-value">{data.stats?.counts?.clicks7d ?? 0}</p>
              <p className="admin-stat-sub">Outbound founder traffic</p>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-label">Open Reports</p>
              <p className="admin-stat-value" style={{ color: (data.stats?.counts?.openReports ?? 0) > 0 ? "var(--stamp)" : "inherit" }}>
                {data.stats?.counts?.openReports ?? 0}
              </p>
              <p className="admin-stat-sub">Moderation queue</p>
            </div>
          </div>

          {/* Recent Takeovers Table */}
          <div className="admin-section">
            <div className="admin-section-header">
              <h2 className="display">Recent Paid Takeovers</h2>
              <button type="button" className="admin-btn" onClick={() => setActiveTab("reigns")}>View All Reigns →</button>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Dethroned</th>
                    <th>Stake Paid</th>
                    <th>Status</th>
                    <th>Claimed At</th>
                    <th>Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.stats?.recentTakeovers || []).map((r: any) => (
                    <tr key={r.id}>
                      <td><strong>{r.kingName}</strong></td>
                      <td>{r.fromName || "Default"}</td>
                      <td className="money" style={{ color: "var(--gold)" }}>{dollars(r.amountCents)}</td>
                      <td><span className={`status-badge status-${r.status}`}>{r.status}</span></td>
                      <td className="microcopy">{new Date(r.paidAt).toLocaleString()}</td>
                      <td>
                        <a href={`/r/${r.publicId}`} target="_blank" rel="noreferrer" className="ink-link">
                          /r/{r.publicId} ↗
                        </a>
                      </td>
                    </tr>
                  ))}
                  {(!data.stats?.recentTakeovers || data.stats.recentTakeovers.length === 0) && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", color: "var(--paper-dim)", padding: "20px" }}>
                        No paid takeovers yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Open Reports */}
          {data.reports.filter((r) => r.status === "pending").length > 0 && (
            <div className="admin-section">
              <div className="admin-section-header">
                <h2 className="display">Pending Moderation Reports</h2>
                <button type="button" className="admin-btn" onClick={() => setActiveTab("reports")}>View Reports Queue →</button>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Reason</th>
                      <th>Details</th>
                      <th>Reported At</th>
                      <th>Quick Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.reports.filter((r) => r.status === "pending").map((rep) => (
                      <tr key={rep.id}>
                        <td><strong>{rep.reason}</strong></td>
                        <td>{rep.details || "—"}</td>
                        <td>{new Date(rep.createdAt).toLocaleString()}</td>
                        <td>
                          <button
                            type="button"
                            className="admin-sm-btn"
                            onClick={() => sendAction({ action: "action_report", reportId: rep.id, actionType: "dismiss" }, "Report dismissed.")}
                          >
                            Dismiss
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: THRONES FULL CRUD                                      */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "thrones" && (
        <section className="admin-section">
          <div className="admin-section-header">
            <div>
              <h2 className="display">Throne Management ({filteredThrones.length})</h2>
              <p className="admin-subtitle">Create, edit, suspend, restore, reorder, force kings, and merge thrones.</p>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <input
                type="search"
                placeholder="Search category or king..."
                value={throneSearch}
                onChange={(e) => setThroneSearch(e.target.value)}
                style={{ padding: "6px 12px", background: "var(--ink)", border: "1px solid var(--rule)", color: "var(--paper)", fontSize: "0.82rem" }}
              />
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={() => setModalState({ type: "create_throne" })}
              >
                + Create Throne
              </button>
            </div>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Category / Slug</th>
                  <th>Status</th>
                  <th>Current King</th>
                  <th>Stake</th>
                  <th>Visits</th>
                  <th>Clicks</th>
                  <th>Source</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredThrones.map((throne) => (
                  <tr key={throne.slug}>
                    <td>
                      <strong>{throne.category}</strong>
                      <div className="microcopy"><code>/t/{throne.slug}</code></div>
                      {throne.aliases && <div className="microcopy" style={{ color: "#887a67" }}>Aliases: {throne.aliases}</div>}
                    </td>
                    <td>
                      <span className={`status-badge status-${throne.status}`}>{throne.status}</span>
                    </td>
                    <td>
                      <a href={throne.kingUrl} target="_blank" rel="noreferrer" className="ink-link">
                        {throne.kingName}
                      </a>
                      <div className="microcopy">Default: {throne.defaultKingName}</div>
                    </td>
                    <td className="money">{dollars(throne.stakeCents)}</td>
                    <td className="money">{throne.recordedVisits ?? 0}</td>
                    <td className="money">{throne.outboundClicks ?? 0}</td>
                    <td><span className="microcopy">{throne.source}</span></td>
                    <td>
                      <div className="admin-action-row">
                        <button
                          type="button"
                          className="admin-sm-btn"
                          onClick={() => setModalState({ type: "edit_throne", target: throne })}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="admin-sm-btn"
                          onClick={() => setModalState({ type: "force_king", target: throne })}
                          title="Force king for video/testing"
                        >
                          Force King
                        </button>
                        <button
                          type="button"
                          className="admin-sm-btn"
                          onClick={() => {
                            if (confirm(`Set "${throne.category}" as the featured homepage throne?`)) {
                              sendAction({ action: "set_featured", slug: throne.slug }, `Featured throne set to ${throne.category}.`);
                            }
                          }}
                        >
                          Feature
                        </button>
                        {throne.status === "live" ? (
                          <button
                            type="button"
                            className="admin-sm-btn"
                            style={{ color: "#ef5350" }}
                            onClick={() => {
                              if (confirm(`Suspend throne "${throne.category}"?`)) {
                                sendAction({ action: "suspend_throne", slug: throne.slug }, "Throne suspended.");
                              }
                            }}
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="admin-sm-btn"
                            style={{ color: "#66bb6a" }}
                            onClick={() => sendAction({ action: "restore_throne", slug: throne.slug }, "Throne restored.")}
                          >
                            Restore
                          </button>
                        )}
                        <button
                          type="button"
                          className="admin-sm-btn"
                          onClick={() => {
                            if (confirm(`Reset throne "${throne.category}" to default king (${throne.defaultKingName}) at $0?`)) {
                              sendAction({ action: "reset_to_default", slug: throne.slug }, "Throne reset to default.");
                            }
                          }}
                        >
                          Reset $0
                        </button>
                        <button
                          type="button"
                          className="admin-sm-btn"
                          onClick={() => setModalState({ type: "merge_throne", target: throne })}
                        >
                          Merge
                        </button>
                        <button
                          type="button"
                          className="admin-sm-btn"
                          style={{ color: "#d32f2f" }}
                          onClick={() => {
                            if (confirm(`PERMANENTLY DELETE "${throne.category}"? This will fail if it has paid historical reigns.`)) {
                              sendAction({ action: "delete_throne", slug: throne.slug }, "Throne deleted.");
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: REIGNS FULL CRUD                                       */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "reigns" && (
        <section className="admin-section">
          <div className="admin-section-header">
            <div>
              <h2 className="display">Campaign & Reign Management ({filteredReigns.length})</h2>
              <p className="admin-subtitle">Audit, edit offer copy, suspend, or delete campaign pages.</p>
            </div>
            <input
              type="search"
              placeholder="Search product, publicId, headline..."
              value={reignSearch}
              onChange={(e) => setReignSearch(e.target.value)}
              style={{ padding: "6px 12px", background: "var(--ink)", border: "1px solid var(--rule)", color: "var(--paper)", fontSize: "0.82rem" }}
            />
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Public ID</th>
                  <th>Product</th>
                  <th>Throne Category</th>
                  <th>Status</th>
                  <th>Stake Paid</th>
                  <th>Visits</th>
                  <th>Clicks</th>
                  <th>Offer Headline</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReigns.map((reign) => (
                  <tr key={reign.id}>
                    <td>
                      <a href={`/r/${reign.publicId}`} target="_blank" rel="noreferrer" className="ink-link">
                        <code>{reign.publicId}</code> ↗
                      </a>
                    </td>
                    <td>
                      <strong>{reign.kingName}</strong>
                      {reign.productXHandle && <div className="microcopy">@{reign.productXHandle}</div>}
                    </td>
                    <td>{reign.category || "—"}</td>
                    <td><span className={`status-badge status-${reign.status}`}>{reign.status}</span></td>
                    <td className="money" style={{ color: reign.amountCents > 0 ? "var(--gold)" : "inherit" }}>
                      {dollars(reign.amountCents)}
                    </td>
                    <td className="money">{reign.recordedVisits ?? 0}</td>
                    <td className="money">{reign.outboundClicks ?? 0}</td>
                    <td style={{ maxWidth: "240px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {reign.offerHeadline || "—"}
                    </td>
                    <td>
                      <div className="admin-action-row">
                        <button
                          type="button"
                          className="admin-sm-btn"
                          onClick={() => setModalState({ type: "edit_reign", target: reign })}
                        >
                          Edit Offer
                        </button>
                        {reign.status === "suspended" ? (
                          <button
                            type="button"
                            className="admin-sm-btn"
                            style={{ color: "#66bb6a" }}
                            onClick={() => sendAction({ action: "restore_reign", publicId: reign.publicId }, "Reign restored.")}
                          >
                            Restore
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="admin-sm-btn"
                            style={{ color: "#ef5350" }}
                            onClick={() => {
                              if (confirm(`Suspend reign /r/${reign.publicId}?`)) {
                                sendAction({ action: "suspend_reign", publicId: reign.publicId }, "Reign suspended.");
                              }
                            }}
                          >
                            Suspend
                          </button>
                        )}
                        <button
                          type="button"
                          className="admin-sm-btn"
                          style={{ color: "#d32f2f" }}
                          onClick={() => setModalState({ type: "delete_reign", target: reign })}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: PRODUCTS & DOMAINS REGISTRY                            */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "products" && (
        <section className="admin-section">
          <div className="admin-section-header">
            <div>
              <h2 className="display">Products & Domains Registry ({filteredProducts.length})</h2>
              <p className="admin-subtitle">Registry derived from campaigns + defaults. Manage strikes and blocks.</p>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <input
                type="search"
                placeholder="Search domain or brand..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                style={{ padding: "6px 12px", background: "var(--ink)", border: "1px solid var(--rule)", color: "var(--paper)", fontSize: "0.82rem" }}
              />
              <button
                type="button"
                className="admin-btn admin-btn-danger"
                onClick={() => setModalState({ type: "block_entity" })}
              >
                + Block Domain / Handle
              </button>
            </div>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Domain</th>
                  <th>Brand Name</th>
                  <th>X Handle</th>
                  <th>Linked Thrones</th>
                  <th>Campaigns</th>
                  <th>Total Spent</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => (
                  <tr key={p.domain}>
                    <td><code>{p.domain}</code></td>
                    <td><strong>{p.displayName}</strong></td>
                    <td>{p.xHandle ? `@${p.xHandle}` : "—"}</td>
                    <td>{p.linkedThrones.join(", ") || "—"}</td>
                    <td className="money">{p.campaignsCount}</td>
                    <td className="money" style={{ color: "var(--gold)" }}>{dollars(p.totalSpentCents)}</td>
                    <td>
                      {p.isBlocked ? (
                        <span className="status-badge status-suspended">BLOCKED</span>
                      ) : (
                        <span className="status-badge status-live">ACTIVE</span>
                      )}
                    </td>
                    <td>
                      {p.isBlocked ? (
                        <button
                          type="button"
                          className="admin-sm-btn"
                          onClick={() => sendAction({ action: "unblock_entity", value: p.domain }, `Unblocked ${p.domain}.`)}
                        >
                          Unblock
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="admin-sm-btn"
                          style={{ color: "#ef5350" }}
                          onClick={() => {
                            const reason = prompt(`Enter block reason for ${p.domain}:`);
                            if (reason) {
                              sendAction({ action: "block_entity", entityType: "domain", value: p.domain, reason }, `Blocked ${p.domain}.`);
                            }
                          }}
                        >
                          Block
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 5: REPORTS QUEUE                                          */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "reports" && (
        <section className="admin-section">
          <div className="admin-section-header">
            <h2 className="display">Category Reports Queue ({data.reports.length})</h2>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Reason</th>
                  <th>Details</th>
                  <th>Status</th>
                  <th>Reported At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.reports.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.reason}</strong></td>
                    <td>{r.details || "—"}</td>
                    <td><span className={`status-badge status-${r.status}`}>{r.status}</span></td>
                    <td className="microcopy">{new Date(r.createdAt).toLocaleString()}</td>
                    <td>
                      <div className="admin-action-row">
                        <button
                          type="button"
                          className="admin-sm-btn"
                          onClick={() => sendAction({ action: "action_report", reportId: r.id, actionType: "dismiss" }, "Dismissed report.")}
                        >
                          Dismiss
                        </button>
                        <button
                          type="button"
                          className="admin-sm-btn"
                          style={{ color: "var(--gold)" }}
                          onClick={() => {
                            const note = prompt("Enter resolution notes for this action:");
                            if (note !== null) {
                              sendAction({ action: "action_report", reportId: r.id, actionType: "refund_flag", notes: note }, "Marked refund flag / actioned.");
                            }
                          }}
                        >
                          Action / Flag
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {data.reports.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", color: "var(--paper-dim)", padding: "20px" }}>
                      No reports in queue.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 6: AUDIT LOGS                                             */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "logs" && (
        <section className="admin-section">
          <div className="admin-section-header">
            <h2 className="display">Court Audit Trail</h2>
            <p className="admin-subtitle">Immutable chronological log of all operator mutations.</p>
          </div>

          <div>
            {data.logs.map((log) => (
              <div key={log.id} className="audit-log-item">
                <div>
                  <span className="audit-log-action">{log.action.toUpperCase()}</span> on <strong>{log.targetType}</strong> (<code>{log.targetId}</code>)
                  {log.beforeSummary && <div className="microcopy">Before: {log.beforeSummary}</div>}
                  {log.afterSummary && <div className="microcopy" style={{ color: "var(--gold)" }}>After: {log.afterSummary}</div>}
                </div>
                <div className="audit-log-meta">
                  {new Date(log.createdAt).toLocaleString()} by {log.actor}
                </div>
              </div>
            ))}
            {data.logs.length === 0 && (
              <p style={{ color: "var(--paper-dim)", textAlign: "center", padding: "20px" }}>No logs recorded yet.</p>
            )}
          </div>
        </section>
      )}

      {/* ============================================================= */}
      {/* MODAL HANDLERS                                                */}
      {/* ============================================================= */}

      {/* 1. Modal: Create Throne */}
      {modalState.type === "create_throne" && (
        <div className="admin-modal-overlay" onClick={() => setModalState({ type: null })}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="display">Create New Throne</h3>
              <button type="button" className="builder-close" onClick={() => setModalState({ type: null })}>✕</button>
            </div>
            <form
              className="admin-form-grid"
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                sendAction({
                  action: "create_throne",
                  category: form.get("category"),
                  slug: form.get("slug"),
                  definition: form.get("definition"),
                  defaultKingName: form.get("defaultKingName"),
                  defaultKingUrl: form.get("defaultKingUrl"),
                  defaultKingXHandle: form.get("defaultKingXHandle"),
                  aliases: form.get("aliases"),
                }, "Throne created successfully.");
              }}
            >
              <label>
                Category Name
                <input name="category" placeholder="e.g. AI Code Editors" required />
              </label>
              <label>
                URL Slug
                <input name="slug" placeholder="e.g. ai-code-editors" required />
              </label>
              <label>
                Definition / Scope
                <textarea name="definition" placeholder="Category definition founders search for..." required rows={2} />
              </label>
              <label>
                Default King Name
                <input name="defaultKingName" placeholder="e.g. Cursor" required />
              </label>
              <label>
                Default King URL
                <input name="defaultKingUrl" type="url" placeholder="https://cursor.com" required />
              </label>
              <label>
                Default King X Handle (Optional)
                <input name="defaultKingXHandle" placeholder="@cursor_ai" />
              </label>
              <label>
                Aliases (Comma Separated)
                <input name="aliases" placeholder="ai editors, ai ide" />
              </label>
              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button type="button" className="admin-btn" onClick={() => setModalState({ type: null })}>Cancel</button>
                <button type="submit" className="admin-btn admin-btn-primary" disabled={loading}>Create Throne ($0 Default King)</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: Edit Throne */}
      {modalState.type === "edit_throne" && modalState.target && (
        <div className="admin-modal-overlay" onClick={() => setModalState({ type: null })}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="display">Edit Throne: {modalState.target.category}</h3>
              <button type="button" className="builder-close" onClick={() => setModalState({ type: null })}>✕</button>
            </div>
            <form
              className="admin-form-grid"
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                sendAction({
                  action: "edit_throne",
                  slug: modalState.target.slug,
                  category: form.get("category"),
                  newSlug: form.get("newSlug"),
                  definition: form.get("definition"),
                  defaultKingName: form.get("defaultKingName"),
                  defaultKingUrl: form.get("defaultKingUrl"),
                  defaultKingXHandle: form.get("defaultKingXHandle"),
                  aliases: form.get("aliases"),
                }, "Throne updated.");
              }}
            >
              <label>
                Category Name
                <input name="category" defaultValue={modalState.target.category} required />
              </label>
              <label>
                Slug (changing this adds old slug to aliases)
                <input name="newSlug" defaultValue={modalState.target.slug} required />
              </label>
              <label>
                Definition
                <textarea name="definition" defaultValue={modalState.target.definition} rows={2} />
              </label>
              <label>
                Default King Name
                <input name="defaultKingName" defaultValue={modalState.target.defaultKingName} required />
              </label>
              <label>
                Default King URL
                <input name="defaultKingUrl" type="url" defaultValue={modalState.target.defaultKingUrl} required />
              </label>
              <label>
                Default King X Handle
                <input name="defaultKingXHandle" defaultValue={modalState.target.defaultKingXHandle || ""} />
              </label>
              <label>
                Aliases (Comma Separated)
                <input name="aliases" defaultValue={modalState.target.aliases || ""} />
              </label>
              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button type="button" className="admin-btn" onClick={() => setModalState({ type: null })}>Cancel</button>
                <button type="submit" className="admin-btn admin-btn-primary" disabled={loading}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal: Force King */}
      {modalState.type === "force_king" && modalState.target && (
        <div className="admin-modal-overlay" onClick={() => setModalState({ type: null })}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="display">Force King: {modalState.target.category}</h3>
              <button type="button" className="builder-close" onClick={() => setModalState({ type: null })}>✕</button>
            </div>
            <p className="microcopy" style={{ marginBottom: "14px" }}>
              Forces a sitting king on this throne, writing a valid campaign record. Ideal for filming or tests.
            </p>
            <form
              className="admin-form-grid"
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                sendAction({
                  action: "force",
                  slug: modalState.target.slug,
                  name: form.get("name"),
                  url: form.get("url"),
                  amount: form.get("amount"),
                  offerHeadline: form.get("offerHeadline"),
                  offerPitch: form.get("offerPitch"),
                  ctaLabel: form.get("ctaLabel"),
                  productXHandle: form.get("productXHandle"),
                  productLogoUrl: form.get("productLogoUrl"),
                }, "Forced new king onto throne.");
              }}
            >
              <label>
                King Product Name
                <input name="name" placeholder="e.g. Supabase" required />
              </label>
              <label>
                Product URL
                <input name="url" type="url" placeholder="https://supabase.com" required />
              </label>
              <label>
                Stake Amount in $
                <input name="amount" type="number" min="0" step="9" defaultValue="9" required />
              </label>
              <label>
                Offer Headline
                <input name="offerHeadline" placeholder="Free migration for first 100 users" />
              </label>
              <label>
                Offer Pitch
                <textarea name="offerPitch" placeholder="Why choose this product..." rows={2} />
              </label>
              <label>
                CTA Button Label
                <input name="ctaLabel" placeholder="Try Product" />
              </label>
              <label>
                Product X Handle
                <input name="productXHandle" placeholder="@supabase" />
              </label>
              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button type="button" className="admin-btn" onClick={() => setModalState({ type: null })}>Cancel</button>
                <button type="submit" className="admin-btn admin-btn-primary" disabled={loading}>Force Reign</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal: Edit Reign */}
      {modalState.type === "edit_reign" && modalState.target && (
        <div className="admin-modal-overlay" onClick={() => setModalState({ type: null })}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="display">Edit Campaign: /r/{modalState.target.publicId}</h3>
              <button type="button" className="builder-close" onClick={() => setModalState({ type: null })}>✕</button>
            </div>
            <form
              className="admin-form-grid"
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                sendAction({
                  action: "edit_reign",
                  publicId: modalState.target.publicId,
                  kingName: form.get("kingName"),
                  kingUrl: form.get("kingUrl"),
                  offerHeadline: form.get("offerHeadline"),
                  offerPitch: form.get("offerPitch"),
                  ctaLabel: form.get("ctaLabel"),
                  productXHandle: form.get("productXHandle"),
                  productLogoUrl: form.get("productLogoUrl"),
                }, "Campaign updated.");
              }}
            >
              <label>
                Product Name
                <input name="kingName" defaultValue={modalState.target.kingName} required />
              </label>
              <label>
                Product URL
                <input name="kingUrl" type="url" defaultValue={modalState.target.kingUrl} required />
              </label>
              <label>
                Offer Headline
                <input name="offerHeadline" defaultValue={modalState.target.offerHeadline || ""} />
              </label>
              <label>
                Offer Pitch
                <textarea name="offerPitch" defaultValue={modalState.target.offerPitch || ""} rows={3} />
              </label>
              <label>
                CTA Label
                <input name="ctaLabel" defaultValue={modalState.target.ctaLabel || ""} />
              </label>
              <label>
                Product X Handle
                <input name="productXHandle" defaultValue={modalState.target.productXHandle || ""} />
              </label>
              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button type="button" className="admin-btn" onClick={() => setModalState({ type: null })}>Cancel</button>
                <button type="submit" className="admin-btn admin-btn-primary" disabled={loading}>Save Campaign</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal: Merge Thrones */}
      {modalState.type === "merge_throne" && modalState.target && (
        <div className="admin-modal-overlay" onClick={() => setModalState({ type: null })}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="display">Merge "{modalState.target.category}" Into Another Throne</h3>
              <button type="button" className="builder-close" onClick={() => setModalState({ type: null })}>✕</button>
            </div>
            <form
              className="admin-form-grid"
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                sendAction({
                  action: "merge_thrones",
                  sourceSlug: modalState.target.slug,
                  targetSlug: form.get("targetSlug"),
                  paidReignAction: form.get("paidReignAction"),
                }, "Thrones merged.");
              }}
            >
              <label>
                Target Destination Throne
                <select name="targetSlug" required className="report-select">
                  {data.thrones.filter((t) => t.slug !== modalState.target.slug).map((t) => (
                    <option key={t.slug} value={t.slug}>{t.category} (/t/{t.slug})</option>
                  ))}
                </select>
              </label>
              <label>
                Paid Reign Handling
                <select name="paidReignAction" required className="report-select">
                  <option value="archive">Archive source reigns as former (Recommended)</option>
                  <option value="reassign">Reassign source reigns to target throne</option>
                </select>
              </label>
              <p className="microcopy">
                Source throne "{modalState.target.category}" will be suspended, and its slug/name will be appended to the target throne's aliases.
              </p>
              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button type="button" className="admin-btn" onClick={() => setModalState({ type: null })}>Cancel</button>
                <button type="submit" className="admin-btn admin-btn-primary" disabled={loading}>Confirm Merge</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal: Delete Reign */}
      {modalState.type === "delete_reign" && modalState.target && (
        <div className="admin-modal-overlay" onClick={() => setModalState({ type: null })}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="display">Delete Campaign: /r/{modalState.target.publicId}</h3>
              <button type="button" className="builder-close" onClick={() => setModalState({ type: null })}>✕</button>
            </div>
            <div className="admin-form-grid">
              <p className="microcopy" style={{ color: "#ff6b6b" }}>
                Permanently delete this campaign. The public <code>/r/{modalState.target.publicId}</code> URL will 404. This cannot be undone.
              </p>
              <p className="microcopy">
                King: <strong>{modalState.target.kingName}</strong> · {modalState.target.kingUrl}
              </p>
              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button type="button" className="admin-btn" onClick={() => setModalState({ type: null })}>Cancel</button>
                <button
                  type="button"
                  className="admin-btn admin-btn-danger"
                  disabled={loading}
                  onClick={() => {
                    sendAction({
                      action: "delete_reign",
                      publicId: modalState.target.publicId,
                    }, "Campaign permanently deleted.");
                  }}
                >
                  Permanently Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal: Block Entity */}
      {modalState.type === "block_entity" && (
        <div className="admin-modal-overlay" onClick={() => setModalState({ type: null })}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="display">Block Domain or Handle</h3>
              <button type="button" className="builder-close" onClick={() => setModalState({ type: null })}>✕</button>
            </div>
            <form
              className="admin-form-grid"
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                sendAction({
                  action: "block_entity",
                  entityType: form.get("entityType"),
                  value: form.get("value"),
                  reason: form.get("reason"),
                  notes: form.get("notes"),
                }, "Entity blocked.");
              }}
            >
              <label>
                Type
                <select name="entityType" required className="report-select">
                  <option value="domain">Domain Name (e.g. spam.com)</option>
                  <option value="handle">X Handle (e.g. @spammer)</option>
                </select>
              </label>
              <label>
                Value
                <input name="value" placeholder="domain.com or @handle" required />
              </label>
              <label>
                Reason
                <input name="reason" placeholder="Reason for blocking..." required />
              </label>
              <label>
                Notes (Internal)
                <textarea name="notes" placeholder="Additional audit notes..." rows={2} />
              </label>
              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button type="button" className="admin-btn" onClick={() => setModalState({ type: null })}>Cancel</button>
                <button type="submit" className="admin-btn admin-btn-danger" disabled={loading}>Block Entity</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </article>
  );
}
