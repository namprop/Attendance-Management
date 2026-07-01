export default function KioskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-900 text-white selection:bg-blue-500/30">
      {/* 
        Màn hình Kiosk Full Screen, loại bỏ Header/Sidebar chung.
        Màu nền tối (Dark Mode) để làm nổi bật camera và thông báo,
        tạo cảm giác sang trọng và chống chói khi để ở quầy cả ngày.
      */}
      <main className="relative w-full h-screen overflow-hidden flex flex-col">
        {children}
      </main>
    </div>
  );
}
