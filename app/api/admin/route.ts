import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  actionReport,
  blockEntity,
  createThroneAdmin,
  deleteThroneAdmin,
  editReignAdmin,
  editThroneAdmin,
  forceReign,
  getAdminDashboardStats,
  getAdminLogs,
  getAllReignsForAdmin,
  getAllThronesForAdmin,
  getProductRegistry,
  getReportsList,
  mergeThronesAdmin,
  repairSeed,
  resetToDefaultKing,
  restorePreviousKing,
  restoreReign,
  restoreThrone,
  setFeaturedThrone,
  suspendReign,
  suspendThrone,
  deleteReignAdmin,
  unblockEntity,
} from "@/lib/admin";
import { canonicalUrl } from "@/lib/format";

const cookieName = "unpaid_king_admin";

function authorized(store: Awaited<ReturnType<typeof cookies>>) {
  return (
    Boolean(process.env.ADMIN_PASSWORD) &&
    store.get(cookieName)?.value === process.env.ADMIN_PASSWORD
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const store = await cookies();

    // 1. Auth: Login
    if (body.action === "login") {
      if (!process.env.ADMIN_PASSWORD || body.password !== process.env.ADMIN_PASSWORD) {
        return NextResponse.json({ ok: false, error: "Invalid admin password." }, { status: 401 });
      }
      store.set(cookieName, process.env.ADMIN_PASSWORD, {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });
      return NextResponse.json({ ok: true });
    }

    // 2. Auth: Logout
    if (body.action === "logout") {
      store.delete(cookieName);
      return NextResponse.json({ ok: true });
    }

    // Auth gate for all mutations and queries below
    if (!authorized(store)) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    // 3. Query: Full Dashboard Bundle
    if (body.action === "get_dashboard_data") {
      const [stats, thronesList, reignsList, products, reportsList, logs] = await Promise.all([
        getAdminDashboardStats(),
        getAllThronesForAdmin(),
        getAllReignsForAdmin(),
        getProductRegistry(),
        getReportsList(),
        getAdminLogs(20),
      ]);

      return NextResponse.json({
        ok: true,
        stats,
        thrones: thronesList,
        reigns: reignsList,
        products,
        reports: reportsList,
        logs,
      });
    }

    // 4. Throne Actions
    if (body.action === "create_throne") {
      const result = await createThroneAdmin({
        category: String(body.category || ""),
        slug: String(body.slug || ""),
        definition: String(body.definition || ""),
        defaultKingName: String(body.defaultKingName || ""),
        defaultKingUrl: String(body.defaultKingUrl || ""),
        defaultKingXHandle: body.defaultKingXHandle ? String(body.defaultKingXHandle) : undefined,
        aliases: body.aliases ? String(body.aliases) : undefined,
      });
      return NextResponse.json({ ok: true, result });
    }

    if (body.action === "edit_throne") {
      await editThroneAdmin(String(body.slug), {
        category: body.category ? String(body.category) : undefined,
        newSlug: body.newSlug ? String(body.newSlug) : undefined,
        definition: body.definition !== undefined ? String(body.definition) : undefined,
        defaultKingName: body.defaultKingName ? String(body.defaultKingName) : undefined,
        defaultKingUrl: body.defaultKingUrl ? String(body.defaultKingUrl) : undefined,
        defaultKingXHandle: body.defaultKingXHandle !== undefined ? String(body.defaultKingXHandle) : undefined,
        aliases: body.aliases !== undefined ? String(body.aliases) : undefined,
      });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "suspend_throne") {
      await suspendThrone(String(body.slug));
      return NextResponse.json({ ok: true });
    }

    if (body.action === "restore_throne") {
      await restoreThrone(String(body.slug));
      return NextResponse.json({ ok: true });
    }

    if (body.action === "delete_throne") {
      await deleteThroneAdmin(String(body.slug));
      return NextResponse.json({ ok: true });
    }

    if (body.action === "merge_thrones") {
      await mergeThronesAdmin(
        String(body.sourceSlug),
        String(body.targetSlug),
        body.paidReignAction === "reassign" ? "reassign" : "archive",
      );
      return NextResponse.json({ ok: true });
    }

    if (body.action === "set_featured") {
      await setFeaturedThrone(String(body.slug));
      return NextResponse.json({ ok: true });
    }

    if (body.action === "reset_to_default") {
      await resetToDefaultKing(String(body.slug));
      return NextResponse.json({ ok: true });
    }

    if (body.action === "restore_previous_king") {
      await restorePreviousKing(String(body.slug));
      return NextResponse.json({ ok: true });
    }

    if (body.action === "force") {
      await forceReign(
        String(body.slug),
        String(body.name).trim(),
        canonicalUrl(String(body.url)),
        Number(body.amount) * 100,
        body.offerHeadline ? String(body.offerHeadline).trim() : undefined,
        body.offerPitch ? String(body.offerPitch).trim() : undefined,
        body.ctaLabel ? String(body.ctaLabel).trim() : undefined,
        body.productXHandle ? String(body.productXHandle).trim() : undefined,
        body.productLogoUrl ? String(body.productLogoUrl).trim() : undefined,
      );
      return NextResponse.json({ ok: true });
    }

    // 5. Reign Actions
    if (body.action === "edit_reign") {
      await editReignAdmin(String(body.publicId), {
        offerHeadline: body.offerHeadline !== undefined ? String(body.offerHeadline) : undefined,
        offerPitch: body.offerPitch !== undefined ? String(body.offerPitch) : undefined,
        ctaLabel: body.ctaLabel !== undefined ? String(body.ctaLabel) : undefined,
        kingName: body.kingName ? String(body.kingName) : undefined,
        kingUrl: body.kingUrl ? String(body.kingUrl) : undefined,
        productXHandle: body.productXHandle !== undefined ? String(body.productXHandle) : undefined,
        productLogoUrl: body.productLogoUrl !== undefined ? String(body.productLogoUrl) : undefined,
      });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "suspend_reign") {
      await suspendReign(String(body.publicId));
      return NextResponse.json({ ok: true });
    }

    if (body.action === "restore_reign") {
      await restoreReign(String(body.publicId));
      return NextResponse.json({ ok: true });
    }

    if (body.action === "delete_reign") {
      await deleteReignAdmin(String(body.publicId));
      return NextResponse.json({ ok: true });
    }

    // 6. Products / Entities Actions
    if (body.action === "block_entity") {
      await blockEntity(
        body.entityType === "handle" ? "handle" : "domain",
        String(body.value),
        String(body.reason || "Court administrative block"),
        body.notes ? String(body.notes) : undefined,
      );
      return NextResponse.json({ ok: true });
    }

    if (body.action === "unblock_entity") {
      await unblockEntity(String(body.value));
      return NextResponse.json({ ok: true });
    }

    // 7. Reports Actions
    if (body.action === "action_report") {
      await actionReport(
        String(body.reportId),
        body.actionType || "dismiss",
        body.notes ? String(body.notes) : undefined,
      );
      return NextResponse.json({ ok: true });
    }

    // 8. Maintenance
    if (body.action === "repair") {
      await repairSeed();
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: `Unknown action: ${body.action}` }, { status: 400 });
  } catch (err: any) {
    console.error("Admin API Error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Server error" }, { status: 500 });
  }
}
