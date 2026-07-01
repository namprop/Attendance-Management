import React, { Suspense } from "react";
import KioskGateway from "@/app/ui/kiosk/KioskGateway";
import Image from "next/image";

// Tắt hoàn toàn cache cho trang Kiosk vì đây là hệ thống real-time
export const dynamic = "force-dynamic";

export default async function KioskPage({
  params,
}: {
  params: Promise<{ locationSlug: string }>;
}) {
  const { locationSlug } = await params;

  return (
    <div className="w-full h-screen overflow-hidden flex flex-col justify-between py-2.5 px-4 bg-slate-900 relative">

      {/* Background Decorators */}
      <div className="absolute top-0 left-0 w-full h-[50vh] bg-linear-to-brom-blue-900/20 to-transparent pointer-events-none" />
      <div className="absolute top-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-600/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-emerald-600/5 blur-[120px] pointer-events-none" />

      {/* Main Kiosk Gateway (Check IP → FaceScanner) - Căn giữa tự động và co giãn linh hoạt */}
      <div className="z-10 w-full max-w-[1400px] mx-auto flex-1 flex flex-col justify-center py-1 min-h-0">
        <Suspense fallback={<div className="text-white text-center">Loading gateway...</div>}>
          <KioskGateway locationSlug={locationSlug} />
        </Suspense>
      </div>

      {/* Footer Info */}
      <div className="w-full flex justify-center z-50 pb-1 pt-1 pointer-events-none">
        <p className="text-slate-500 text-[10px] font-medium">
          Cơ sở: <span className="text-slate-300 font-bold uppercase">{locationSlug}</span>
        </p>
      </div>
    </div>
  );
}
