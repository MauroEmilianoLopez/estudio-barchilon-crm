# CRM — Estudio Abril Barchilon

CRM jurídico hecho a medida para el estudio de la Dra. Abril Barchilon (San Luis, Argentina). Track de casos judiciales y trámites administrativos, agenda de vencimientos y audiencias, pagos, y notificaciones automáticas al cliente vía WhatsApp.

Mobile-first: el día a día se opera desde un Samsung 4G.

## Stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript** strict · **Tailwind CSS v4** · **shadcn/ui**
- **Turso** (libSQL serverless) + **Drizzle ORM**
- **Clerk** (auth)
- **Vercel** (hosting)
- **Valeria** — agente externo de WhatsApp ([whatsapp-agentkit](https://github.com/MauroEmilianoLopez/whatsapp-agentkit), FastAPI + Python en Railway). Endpoint `/notify` para notificaciones transaccionales sin pasar por LLM.

## Features

### Dos pipelines paralelos
- **Judicial** (color azul) — 7 etapas: Consulta inicial → Prospecto → Mediaciones → En proceso → Esperando documentos → Etapa final (`is_won`) → Cerrado.
- **Administrativo** (color amber) — 7 etapas para trámites en ANSES, DPIP, Defensa del Consumidor, RPI, etc.: Consulta inicial → Documentación → Presentado → En trámite → Resolución → Cobro (`is_won`) → Cerrado.
- Página `/pipeline` con tabs. Drag & drop entre etapas (`@dnd-kit`).

### Agenda
- Vencimientos judiciales y tareas de procuración tipados por separado en la tabla `tareas`.
- Conteo en **días hábiles** (excluye sábado y domingo) — convención obligatoria del proyecto.
- Alertas en el dashboard: plazo perentorio próximo (banner rojo), prospectos sin contacto >5 días hábiles (card amber), pagos pendientes, contactos stale.

### Pagos
- Honorarios pactados vs pagos parciales; saldo visible en cada caso.
- Registro de pagos con fecha, monto, método, comprobante.

### Notificaciones automáticas vía WhatsApp
Disparadores que llaman a Valeria (`tryNotify` → proxy `/api/notify` → Valeria `/notify` → Whapi). Si Valeria falla, fallback al modal manual de WhatsApp Web con el mensaje pre-cargado.

| Trigger | Plantilla |
|---|---|
| Pago registrado | `confirmacion_pago` |
| Tarea completada | `tarea_realizada` |
| Deal entra a stage `is_won` | `resolucion_favorable` |
| Audiencia/fecha de actuación nueva al crear/editar caso | `audiencia` |
| Auto-tarea al crear deal en "Prospecto" (Seguimiento +5 días hábiles) | — |
| Actividad registrada (audiencia, escrito, llamada, reunión, oficio, notificación) | `act_*` (variantes con/sin título de caso) |

Las notas internas (`type=nota`) **no** notifican.

### Auth
Rutas protegidas via Clerk middleware. `sign-in` y `sign-up` públicos.

## Estructura

```
src/
├── app/
│   ├── (auth)/sign-in, sign-up    # Clerk
│   ├── api/
│   │   ├── activities/            # CRUD actividades
│   │   ├── agenda/                # Vencimientos + tareas combinados
│   │   ├── contacts/              # CRUD contactos
│   │   ├── deals/                 # CRUD deals + auto-tarea Prospecto
│   │   ├── notify/                # Proxy a Valeria con X-Notify-Token
│   │   ├── pipeline/              # GET ?type=judicial|administrativo
│   │   ├── payments/, tareas/     # CRUDs auxiliares
│   │   └── webhook/               # Recibe leads externos (Typeform, etc.)
│   ├── pipeline/                  # Page con tabs Judicial/Administrativo
│   ├── deals/[id]/                # Detalle de caso
│   ├── contacts/[id]/             # Detalle de contacto
│   ├── agenda/                    # Vencimientos + tareas pendientes
│   └── page.tsx                   # Dashboard
├── components/
│   ├── pipeline/
│   │   ├── KanbanBoard.tsx        # Drag & drop, detección won via flag isWon
│   │   ├── KanbanColumn.tsx       # Columna con border-top color de la etapa
│   │   ├── DealCard.tsx           # Card wrappeada en <a href> nativo
│   │   └── PipelineTabs.tsx       # Tabs con key={tab} forzando remount
│   ├── deals/                     # DealForm con selector judicial/admin adaptativo
│   ├── activities/                # ActivityForm con tryNotify por tipo
│   ├── whatsapp/WhatsAppModal.tsx # Templates exportables + fallback manual
│   ├── dashboard/                 # KPIs, secciones streaming via Suspense
│   └── ui/                        # shadcn/ui
├── db/
│   ├── schema.ts                  # Drizzle schema
│   ├── index.ts                   # Cliente libSQL
│   └── seed.ts                    # Datos demo
├── lib/
│   ├── businessDays.ts            # addBusinessDays + businessDaysBetween
│   ├── whatsappNotify.ts          # tryNotify helper con toast.success/error
│   └── constants.ts               # formatCurrency, buildWhatsAppUrl, etc.
└── types/index.ts                 # Tipos compartidos

scripts/
├── add-pipeline-types.ts          # Migración: 2 pipelines + organismo
├── add-prospecto-stage.ts         # Migración: nueva etapa Prospecto
├── rename-stages.ts               # Migración: rename a Mediaciones/Etapa final/Cerrado
└── dry-run-*.ts                   # Dry-runs de cada migración
```

## Variables de entorno

`.env.local`:

```bash
# Turso (libSQL)
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=eyJhbGc...

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Valeria — notificaciones automáticas (opcional, si falta los triggers caen al modal manual)
VALERIA_NOTIFY_URL=https://whatsapp-agentkit-production-XXXX.up.railway.app/notify
VALERIA_NOTIFY_TOKEN=<openssl rand -hex 32>
```

En Vercel cargar las mismas en Settings → Environment Variables. En Railway cargar `VALERIA_NOTIFY_TOKEN` (y `WHAPI_TOKEN` para Valeria).

## Correr localmente

```bash
npm install
npm run dev          # http://localhost:3000
```

Otros comandos:

```bash
npm run build        # Build de producción
npm run lint         # ESLint
npm run init         # Inicializa schema en una DB nueva
npm run init:seed    # Init + datos demo
```

Migraciones de datos contra Turso (no usar drizzle-kit migrate para fixes puntuales — el patrón del proyecto es scripts tsx con `client.transaction("write")`):

```bash
npx tsx scripts/dry-run-<nombre>.ts   # Dry-run primero
npx tsx scripts/<nombre>.ts           # Ejecutar tras OK
```

## Reglas de código

- **Idioma UI**: Español rioplatense por defecto.
- **Mobile-first**: cualquier diseño desktop-first rompe el día a día de Abril.
- **Días hábiles obligatorios** para todo conteo de fechas (vencimientos, recordatorios, schedules).
- **Max ~300 líneas por componente** — partir si crece.
- **Sin emojis como íconos** — usar Lucide React (SVG).
- **Valores monetarios en centavos** (integer); usar `formatCurrency()` para mostrar.
- **Drag & drop con `@dnd-kit`** (NO `react-beautiful-dnd`).
- **Migraciones destructivas requieren dry-run + confirmación** del usuario antes de la fase destructiva.
- **Detección de won stage por flag `isWon`** (NO por nombre hardcoded — desde la migración a 2 pipelines).

## Despliegue

- **Vercel** auto-deploy desde `main`. Variables de entorno en Settings.
- **Turso** prod en `aws-us-east-1`. Backups vía `turso db shell <name> ".backup"` si se necesita.
- **Valeria** auto-deploy en Railway desde el repo `whatsapp-agentkit`. Si Railway tiene un incidente, forzar con `railway up --service whatsapp-agentkit --ci`.

## Arquitectura del sistema

```
                ┌─────────────┐
                │  Vercel     │
   Browser ──▶  │  Next.js    │ ──▶ Turso (deals, stages, activities, tareas, payments)
                │  + Clerk    │
                └─────┬───────┘
                      │
                      │ POST /api/notify
                      ▼
                ┌─────────────┐         ┌──────────────┐
                │ /api/notify │ ──────▶ │  Valeria     │ ──▶ Whapi.cloud ──▶ WhatsApp
                │ (proxy)     │  X-Token │  (Railway)   │
                └─────────────┘         └──────────────┘
                      │
                      │ Si Valeria 5xx/timeout
                      ▼
                Modal manual de WhatsApp Web (fallback)
```

El proxy `/api/notify` existe para no exponer `VALERIA_NOTIFY_TOKEN` al browser. Valeria es un proxy "tonto" a Whapi cuando recibe en `/notify` (bypassa el LLM); el endpoint `/webhook` sí pasa por el LLM para conversaciones inbound.

## Comandos `/` interactivos

Disponibles desde Claude Code en la raíz del proyecto:

| Comando | Función |
|---|---|
| `/setup` | Setup inicial del CRM |
| `/add-lead` | Crear lead conversacionalmente |
| `/analyze-pipeline` | Análisis del pipeline con recomendaciones |
| `/daily-briefing` | Resumen ejecutivo del día |
| `/import-contacts` | Importar contactos desde CSV |
| `/customize` | Cambiar configuración |
| `/connect` | Conectar con Gmail/Calendar/Sheets/WhatsApp |
| `/digest` | Enviar digest diario por email (requiere Resend) |

## Licencia

Privado — uso interno del Estudio Barchilon.
