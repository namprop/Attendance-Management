import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { getAllRows } from "@/app/lib/monggodb/mongoDBCRUD";
import { BranchArea } from "@/app/data/interface/branchArea";


export async function POST(req: NextRequest) {
    const authError = await requireAuth(req);
    if (authError) return authError;

    const {
        action,
        collectionName = "BranchArea",
        filters = {},
        field,
        value,
        search,
        skip,
        limit,
        sort,
    } = await req.json();

    try {
        switch (action) {
            case "read":
                return NextResponse.json(
                    await getAllRows<BranchArea>(collectionName, {
                        search,
                        skip,
                        limit,
                        field,
                        value,
                        filters,
                        sort,
                    })
                );

            default:
                return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }
    } catch (error) {
        console.error("MongoDB API Error:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
