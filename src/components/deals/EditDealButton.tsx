"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { DealForm } from "./DealForm";

interface EditDealButtonProps {
  dealId: string;
}

export function EditDealButton({ dealId }: EditDealButtonProps) {
  const [open, setOpen] = useState(false);

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
