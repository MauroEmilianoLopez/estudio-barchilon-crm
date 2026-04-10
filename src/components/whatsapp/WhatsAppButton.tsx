"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { WhatsAppModal } from "./WhatsAppModal";

interface DealInfo {
  title: string;
  agreedFees: number | null;
  paidAmount: number;
  nextHearing: string | null;
}

interface WhatsAppButtonProps {
  contactName: string;
  contactPhone: string;
  deals?: DealInfo[];
  size?: "sm" | "default";
}

export function WhatsAppButton({ contactName, contactPhone, deals, size = "sm" }: WhatsAppButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size={size}
        onClick={() => setOpen(true)}
        className="cursor-pointer text-green-700 border-green-300 hover:bg-green-50"
      >
        <MessageCircle className="h-4 w-4 mr-1" />
        WhatsApp
      </Button>
      <WhatsAppModal
        open={open}
        onClose={() => setOpen(false)}
        contactName={contactName}
        contactPhone={contactPhone}
        deals={deals}
      />
    </>
  );
}
