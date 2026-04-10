"use client";

import { useState, useEffect } from "react";
import { ContactsTable } from "@/components/contacts/ContactsTable";
import { ContactForm } from "@/components/contacts/ContactForm";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { Contact } from "@/types";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadContacts = () => {
    fetch("/api/contacts")
      .then((res) => res.json())
      .then((data) => {
        setContacts(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadContacts();
  }, []);

  const handleCloseForm = () => {
    setShowForm(false);
    loadContacts();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Contactos</h1>
          <p className="text-muted-foreground text-sm hidden sm:block">
            Gestiona tus clientes y consultas
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)} className="cursor-pointer shrink-0">
          <Plus className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Nuevo Contacto</span>
          <span className="sm:hidden">Nuevo</span>
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <ContactsTable contacts={contacts} />
      )}

      <ContactForm open={showForm} onClose={handleCloseForm} />
    </div>
  );
}
