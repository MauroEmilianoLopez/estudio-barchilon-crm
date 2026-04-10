"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Search, Users, Download, MessageCircle } from "lucide-react";
import { WhatsAppModal } from "@/components/whatsapp/WhatsAppModal";
import { formatDate } from "@/lib/constants";
import { SOURCE_LABELS } from "@/lib/constants";
import type { Contact, Temperature, LeadSource } from "@/types";

interface ContactsTableProps {
  contacts: Contact[];
}

export function ContactsTable({ contacts }: ContactsTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterTemp, setFilterTemp] = useState<Temperature | "">("");

  const filtered = contacts.filter((c) => {
    const matchesSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.company?.toLowerCase().includes(search.toLowerCase());

    const matchesTemp = !filterTemp || c.temperature === filterTemp;

    return matchesSearch && matchesTemp;
  });

  if (contacts.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No hay contactos"
        description="Agrega tu primer cliente para comenzar a gestionar tus casos."
        actionLabel="Agregar contacto"
        onAction={() => router.push("/contacts?new=true")}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, email o empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {(["", "hot", "warm", "cold"] as const).map((temp) => (
            <Button
              key={temp}
              variant={filterTemp === temp ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterTemp(temp)}
              className="cursor-pointer"
            >
              {temp === "" ? "Todos" : temp === "hot" ? "Urgente" : temp === "warm" ? "En curso" : "Inactivo"}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("/api/export?type=contacts")}
            className="cursor-pointer"
          >
            <Download className="h-4 w-4 mr-1" />
            Exportar
          </Button>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead className="hidden sm:table-cell">Tipo de causa</TableHead>
              <TableHead className="hidden md:table-cell">Fuente</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="hidden md:table-cell">Prioridad</TableHead>
              <TableHead className="hidden lg:table-cell">Fecha</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((contact) => (
              <TableRow
                key={contact.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => router.push(`/contacts/${contact.id}`)}
              >
                <TableCell>
                  <div>
                    <p className="font-medium">{contact.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {contact.email || "Sin email"}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {contact.caseType
                    ? ({ civil: "Civil", laboral: "Laboral", penal: "Penal", familia: "Familia", comercial: "Comercial", otro: "Otro" }[contact.caseType] || contact.caseType)
                    : "-"}
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm">
                  {SOURCE_LABELS[contact.source as LeadSource] || contact.source}
                </TableCell>
                <TableCell>
                  <StatusBadge temperature={contact.temperature as Temperature} size="sm" />
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {contact.score >= 70 ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      Urgente
                    </span>
                  ) : contact.score >= 40 ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                      Normal
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      Sin prisa
                    </span>
                  )}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                  {formatDate(contact.createdAt)}
                </TableCell>
                <TableCell>
                  {contact.phone && (
                    <WhatsAppCell contact={contact} />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {filtered.length} de {contacts.length} contactos
      </p>
    </div>
  );
}

function WhatsAppCell({ contact }: { contact: Contact }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="p-1.5 rounded-full hover:bg-green-50 cursor-pointer transition-colors"
        title="Enviar WhatsApp"
      >
        <MessageCircle className="h-4 w-4 text-green-600" />
      </button>
      <WhatsAppModal
        open={open}
        onClose={() => setOpen(false)}
        contactName={contact.name}
        contactPhone={contact.phone!}
      />
    </>
  );
}
