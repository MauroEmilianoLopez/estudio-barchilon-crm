import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contacts, deals, pipelineStages } from "@/db/schema";
import { or, like, eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ contacts: [], deals: [] });
  }

  const pattern = `%${q}%`;

  const matchedContacts = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      email: contacts.email,
      phone: contacts.phone,
    })
    .from(contacts)
    .where(
      or(
        like(contacts.name, pattern),
        like(contacts.email, pattern),
        like(contacts.phone, pattern)
      )
    )
    .limit(5);

  const matchedDeals = await db
    .select({
      id: deals.id,
      title: deals.title,
      contactName: contacts.name,
      caseNumber: deals.caseNumber,
      court: deals.court,
      stageName: pipelineStages.name,
      stageColor: pipelineStages.color,
    })
    .from(deals)
    .leftJoin(contacts, eq(deals.contactId, contacts.id))
    .leftJoin(pipelineStages, eq(deals.stageId, pipelineStages.id))
    .where(
      or(
        like(deals.title, pattern),
        like(contacts.name, pattern),
        like(deals.caseNumber, pattern),
        like(deals.court, pattern)
      )
    )
    .limit(5);

  return NextResponse.json({
    contacts: matchedContacts,
    deals: matchedDeals,
  });
}
