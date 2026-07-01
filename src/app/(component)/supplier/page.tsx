import { Suspense } from "react";
import SupplierListClient from "./table-supplier";

export default function Page() {
  return (
    <Suspense fallback={<div>Đang tải...</div>}>
      <SupplierListClient />
    </Suspense>
  );
}
