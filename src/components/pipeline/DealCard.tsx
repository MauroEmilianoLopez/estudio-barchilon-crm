"use client";

import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/constants";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface DealCardProps {
  id: string;
  title: string;
  value: number;
  contactName: string | null;
  contactTemperature: string | null;
  probability: number;
  agreedFees: number | null;
  paidAmount: number;
}

function PaymentBadge({ agreedFees, paidAmount }: { agreedFees: number | null; paidAmount: number }) {
  if (!agreedFees || agreedFees === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
        Sin honorarios
      </span>
    );
  }

  if (paidAmount >= agreedFees) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
        Al dia
      </span>
    );
  }

  if (paidAmount > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
        Pago parcial
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
      Sin pago
    </span>
  );
}

export function DealCard({
  id,
  title,
  contactName,
  agreedFees,
  paidAmount,
}: DealCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const fees = agreedFees || 0;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
    >
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground truncate">
          {contactName || "Sin cliente"}
        </p>
        <p className="text-sm font-medium leading-tight">{title}</p>

        {fees > 0 && (
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-muted-foreground">
              {formatCurrency(paidAmount)} / {formatCurrency(fees)}
            </span>
          </div>
        )}

        <PaymentBadge agreedFees={agreedFees} paidAmount={paidAmount} />
      </div>
    </Card>
  );
}
