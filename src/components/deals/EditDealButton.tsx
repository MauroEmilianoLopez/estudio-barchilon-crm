"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { DealForm } from "./DealForm";

interface EditDealButtonProps {
  dealId: string;
}

function EditDealButtonInner({ dealId }: EditDealButtonProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("edit") === "1") {
      setOpen(true);
      router.replace(pathname, { scroll: false });
    }
  }, [searchParams, router, pathname]);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="cursor-pointer"
      >
        <Pencil className="h-4 w-4 mr-1" />
        Editar caso
      </Button>
      <DealForm open={open} onClose={() => setOpen(false)} dealId={dealId} />
    </>
  );
}

export function EditDealButton({ dealId }: EditDealButtonProps) {
  return (
    <Suspense fallback={null}>
      <EditDealButtonInner dealId={dealId} />
    </Suspense>
  );
}
