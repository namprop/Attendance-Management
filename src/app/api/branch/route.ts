// /app/api/branch/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { ObjectId } from "mongodb";

import {
  addRow,
  deleteByField,
  findByField,
  getAllRows,
  updateByField,
} from "@/app/lib/monggodb/mongoDBCRUD";

export const runtime = "nodejs";

// -------------------- Types --------------------
type ProductId = string | ObjectId;

export type Branch_Create_DBType = {
  products: ProductId[];
  name: string;
  address: string;
  businessRegion: string;
};

export type Branch_DBType = Branch_Create_DBType & {
  _id: ObjectId;
  createdAt?: string;
  updatedAt?: string;
};

type SyncProductsPayload = {
  branchId: string;
  productIds: string[];
  mode: "add" | "remove";
};

// -------------------- Helpers --------------------
type BranchArea_DBType = {
  code: string;
  name: string;
  [key: string]: unknown;
};

function toObjectIdSafe(v: unknown): ObjectId | null {
  if (v instanceof ObjectId) return v;
  const s = String(v ?? "").trim();
  if (!ObjectId.isValid(s)) return null;
  return new ObjectId(s);
}

function toTrimString(v: unknown): string {
  return String(v ?? "").trim();
}

function normalizeBusinessRegionNameLoose(input: string): string {
  const raw = String(input ?? "").trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();

  if (
    raw === "1" ||
    raw === "hn" ||
    lower.includes("hà nội") ||
    lower.includes("ha noi") ||
    lower.includes("hanoi")
  )
    return "Hà Nội";

  if (
    raw === "2" ||
    raw === "hcm" ||
    lower.includes("hcm") ||
    lower.includes("sài gòn") ||
    lower.includes("sai gon") ||
    lower.includes("hồ chí minh") ||
    lower.includes("ho chi minh") ||
    lower.includes("hochiminh")
  )
    return "HCM";

  if (
    raw === "3" ||
    lower.includes("đà nẵng") ||
    lower.includes("da nang") ||
    lower.includes("danang")
  )
    return "Đà Nẵng";

  if (
    lower.includes("hải phòng") ||
    lower.includes("hai phong") ||
    lower.includes("haiphong")
  )
    return "Hải Phòng";

  return raw;
}

async function resolveBusinessRegionCode(input: unknown): Promise<string> {
  if (!input) return "";

  if (typeof input === "object") {
    const anyInput = input as Record<string, unknown>;
    if (typeof anyInput?.code === "string") return toTrimString(anyInput.code);
    if (typeof anyInput?.value === "string")
      return toTrimString(anyInput.value);
  }

  const raw = toTrimString(input);
  if (!raw) return "";

  const collectionName = "BranchArea";

  const byCode = await findByField<BranchArea_DBType>(
    collectionName,
    "code" as keyof BranchArea_DBType,
    raw,
  ).then((r) => r?.data);
  const areaByCode = pickOne<BranchArea_DBType>(byCode);
  if (areaByCode?.code) return toTrimString(areaByCode.code);

  const byName = await findByField<BranchArea_DBType>(
    collectionName,
    "name" as keyof BranchArea_DBType,
    raw,
  ).then((r) => r?.data);
  const areaByName = pickOne<BranchArea_DBType>(byName);
  if (areaByName?.code) return toTrimString(areaByName.code);

  const normalizedName = normalizeBusinessRegionNameLoose(raw);
  if (normalizedName && normalizedName !== raw) {
    const byNormalizedName = await findByField<BranchArea_DBType>(
      collectionName,
      "name" as keyof BranchArea_DBType,
      normalizedName,
    ).then((r) => r?.data);
    const areaByNormalizedName = pickOne<BranchArea_DBType>(byNormalizedName);
    if (areaByNormalizedName?.code)
      return toTrimString(areaByNormalizedName.code);
  }

  return raw;
}

function normalizeProducts(input: unknown): ObjectId[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((p) => toObjectIdSafe(p))
    .filter((x): x is ObjectId => x !== null);
}

function pickOne<T>(data: unknown): T | null {
  if (!data) return null;
  return Array.isArray(data) ? ((data[0] ?? null) as T | null) : (data as T);
}

function unwrapData(input: unknown) {
  if (!input || typeof input !== "object") return input;
  if ("data" in input && input.data && typeof input.data === "object")
    return input.data;
  return input;
}

export async function POST(req: NextRequest) {
    const authError = await requireAuth(req);
    if (authError) return authError;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;

  if (!body) {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { action, data, filters, field, value, search, skip, limit, sort } =
    body;

  const fixedValue = field === "_id" ? (toObjectIdSafe(value) ?? value) : value;

  try {
    switch (action) {
      // -------------------- CREATE --------------------
      case "create": {
        const raw = unwrapData(data);
        if (!raw || Array.isArray(raw) || typeof raw !== "object") {
          return NextResponse.json(
            { success: false, error: "No available data for create" },
            { status: 400 },
          );
        }

        const payload = { ...(raw as Record<string, unknown>) } as Partial<Branch_Create_DBType>;

        // ✅ KHÔNG cho client gửi _id
        if ("_id" in payload) delete payload._id;

        const name = toTrimString(payload.name);
        const address = toTrimString(payload.address);
        const businessRegion = await resolveBusinessRegionCode(
          payload.businessRegion,
        );

        if (!name || !address || !businessRegion) {
          return NextResponse.json(
            {
              success: false,
              error: "Missing name / address / businessRegion",
            },
            { status: 400 },
          );
        }

        const products = normalizeProducts(payload.products);
        const now = new Date().toISOString();

        const _idNew = await addRow("Branches", {
          name,
          address,
          businessRegion,
          products,
          createdAt: now,
          updatedAt: now,
        } as Branch_Create_DBType & { createdAt: string; updatedAt: string });

        return NextResponse.json({ success: true, _id: String(_idNew) });
      }

      // -------------------- READ --------------------
      case "read": {
        return NextResponse.json(
          await getAllRows<Branch_DBType>("Branches", {
            search,
            skip,
            limit,
            field,
            value,
            filters,
            sort,
          } as Record<string, unknown>),
        );
      }

      // -------------------- GET BY FIELD --------------------
      case "getByField": {
        if (!field || value === undefined) {
          return NextResponse.json(
            { success: false, error: "Missing field or value" },
            { status: 400 },
          );
        }
        const v = field === "_id" ? (toObjectIdSafe(value) ?? value) : value;

        return NextResponse.json(
          await findByField<Branch_DBType>(
            "Branches",
            field as keyof Branch_DBType,
            v as string | number,
          ).then((res) => res?.data),
        );
      }

      // -------------------- UPDATE --------------------
      case "update": {
        const raw = unwrapData(data);
        if (!field || value === undefined || !raw || typeof raw !== "object") {
          return NextResponse.json(
            { success: false, error: "Missing field/value or data for update" },
            { status: 400 },
          );
        }

        const payload: Record<string, unknown> = { ...(raw as Record<string, unknown>) };

        if ("_id" in payload) delete payload._id;

        if ("name" in payload) {
          const n = toTrimString(payload.name);
          if (!n)
            return NextResponse.json(
              { success: false, error: "name cannot be empty" },
              { status: 400 },
            );
          payload.name = n;
        }
        if ("address" in payload) {
          const a = toTrimString(payload.address);
          if (!a)
            return NextResponse.json(
              { success: false, error: "address cannot be empty" },
              { status: 400 },
            );
          payload.address = a;
        }
        if ("businessRegion" in payload) {
          const br = await resolveBusinessRegionCode(payload.businessRegion);
          if (!br) {
            return NextResponse.json(
              { success: false, error: "businessRegion cannot be empty" },
              { status: 400 },
            );
          }
          payload.businessRegion = br;
        }

        if ("products" in payload)
          payload.products = normalizeProducts(payload.products);

        await updateByField<Branch_DBType>(
          "Branches",
          field as keyof Branch_DBType,
          fixedValue as string | number,
          { ...payload, updatedAt: new Date().toISOString() } as Partial<Branch_DBType>,
        );

        return NextResponse.json({ success: true });
      }

      // -------------------- DELETE --------------------
      case "delete": {
        if (!field || value === undefined) {
          return NextResponse.json(
            { success: false, error: "Missing field or value for delete" },
            { status: 400 },
          );
        }
        await deleteByField<Branch_DBType>(
          "Branches",
          field as keyof Branch_DBType,
          fixedValue as string | number,
        );
        return NextResponse.json({ success: true });
      }

      // -------------------- SYNC PRODUCTS --------------------
      case "syncProducts": {
        const raw = unwrapData(data);
        if (!raw || typeof raw !== "object") {
          return NextResponse.json(
            { success: false, error: "Missing data" },
            { status: 400 },
          );
        }

        const { branchId, productIds, mode } =
          raw as Partial<SyncProductsPayload>;

        if (
          !branchId ||
          !Array.isArray(productIds) ||
          (mode !== "add" && mode !== "remove")
        ) {
          return NextResponse.json(
            {
              success: false,
              error: "Missing/invalid branchId/productIds/mode",
            },
            { status: 400 },
          );
        }

        const bid = toObjectIdSafe(branchId);
        if (!bid)
          return NextResponse.json(
            { success: false, error: "Invalid branchId" },
            { status: 400 },
          );

        const found = await findByField<Branch_DBType>(
          "Branches",
          "_id" as keyof Branch_DBType,
          bid as unknown as string | number,
        ).then((r) => r?.data);
        const branch = pickOne<Branch_DBType>(found);
        if (!branch)
          return NextResponse.json(
            { success: false, error: "Branch not found" },
            { status: 404 },
          );

        const currentIds = (branch.products ?? []).map((x: unknown) =>
          String(x),
        );
        const set = new Set(currentIds);

        if (mode === "add") {
          for (const pid of productIds) if (ObjectId.isValid(pid)) set.add(pid);
        } else {
          for (const pid of productIds) set.delete(pid);
        }

        const nextProducts = Array.from(set)
          .filter((x) => ObjectId.isValid(String(x)))
          .map((x) => new ObjectId(String(x)));

        await updateByField<Branch_DBType>(
          "Branches",
          "_id" as keyof Branch_DBType,
          bid as unknown as string | number,
          {
            products: nextProducts,
            updatedAt: new Date().toISOString(),
          } as Partial<Branch_DBType>
        );

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 },
        );
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Server error";
    return NextResponse.json(
      { success: false, error: String(msg) },
      { status: 500 },
    );
  }
}
