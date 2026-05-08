@AGENTS.md
# Skill_u Platform — CLAUDE.md

Guía de referencia para trabajar en este proyecto con IA. Lee esto antes de hacer cualquier cambio.

## Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript
- **Backend:** Supabase (Auth + PostgreSQL + Storage)
- **Pagos:** Stripe (COP, pesos colombianos)
- **Estilos:** CSS variables globales en `globals.css`, sin Tailwind
- **Build:** Turbopack (`npm run dev`)

## Variables de entorno requeridas

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # Solo servidor, nunca exponer al cliente
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
```

> `SUPABASE_SERVICE_ROLE_KEY` solo se usa en API routes del servidor (`src/app/api/`). Nunca importar en componentes cliente.

## Estructura de carpetas

```
src/
├── app/
│   ├── (admin)/          # Panel de curación — ruta /admin
│   │   ├── layout.tsx    # Solo UserProvider + admin-shell, sin lógica
│   │   └── admin/
│   │       └── page.tsx  # Panel completo del curador
│   ├── (auth)/           # Login y registro — rutas /login, /register
│   ├── (dashboard)/      # App principal — /materiales, /mis-compras, etc.
│   ├── api/
│   │   ├── curator/materials/route.ts   # CRUD admin de materiales
│   │   ├── create-payment-intent/       # Stripe
│   │   └── reviews/                     # Reseñas y reputación
│   └── layout.tsx        # Root layout
├── components/
│   ├── auth/             # AuthLeft (panel izquierdo de login)
│   ├── dashboard/        # Sidebar, modales, componentes del marketplace
│   ├── reputation/       # Sistema de reseñas y calificaciones
│   └── ui/               # Toast, ConfirmModal
├── hooks/
│   └── useReputation.ts
├── lib/
│   ├── supabase.ts       # Cliente browser (createBrowserClient de @supabase/ssr)
│   ├── UserContext.tsx   # Perfil del usuario autenticado
│   ├── CartContext.tsx   # Carrito en memoria (sin persistencia)
│   └── useAdminGuard.ts  # Protege rutas admin, lee sesión directamente
└── types/
    ├── material.ts       # Material, SUBJECTS, FILE_TYPE_THUMB
    ├── reputation.ts     # SellerReview, SellerReputation
    └── auth.ts
```

## Base de datos — tablas principales

### `profiles`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | FK → auth.users |
| first_name | text | |
| last_name | text | |
| program | text | Carrera universitaria |
| is_seller | boolean | default false |
| is_admin | boolean | default false — solo 1 usuario admin |

### `materials`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | |
| user_id | uuid | FK → profiles |
| title | text | |
| description | text | |
| subject | text | Ver SUBJECTS en types/material.ts |
| price | integer | En COP |
| file_url | text | URL de Supabase Storage |
| file_type | text | PDF / DOC / IMG / VID |
| file_size | text | |
| is_visible | boolean | true = visible en marketplace |
| curation_status | text | pending / approved / rejected |
| curation_notes | text | Nota del curador al vendedor |
| curated_by | uuid | FK → auth.users |
| curated_at | timestamptz | |

### `seller_reviews`
| Columna | Tipo | Notas |
|---|---|---|
| seller_id | uuid | |
| reviewer_id | uuid | No puede ser igual a seller_id |
| rating | int | 1–5 |
| comment | text | Opcional |
| is_anonymous | boolean | |

## Roles de usuario

| Rol | Cómo se identifica | Panel |
|---|---|---|
| Comprador | `is_seller = false`, `is_admin = false` | /materiales |
| Vendedor | `is_seller = true` | /materiales + /mis-publicaciones |
| Administrador | `is_admin = true` | /admin (panel curador) |

El login detecta el rol automáticamente y redirige:
- Admin → `/admin`
- Todos los demás → `/materiales`

## Flujo de curación de materiales

1. Vendedor publica material → `curation_status = 'pending'`, `is_visible = false`
2. Admin entra a `/admin` y revisa el material
3. **Aprueba** → `curation_status = 'approved'`, `is_visible = true`
4. **Rechaza** → `curation_status = 'rejected'`, `is_visible = false`, se guarda nota

> El marketplace solo muestra materiales con `is_visible = true` AND `curation_status = 'approved'` (via función RPC `get_visible_materials`).

## API routes

### `GET /api/curator/materials`
- Requiere header `Authorization: Bearer <token>`
- Query params: `status` (pending/approved/rejected), `search`
- Verifica `is_admin = true` antes de responder
- Usa `SUPABASE_SERVICE_ROLE_KEY` para bypassear RLS

### `PATCH /api/curator/materials`
- Body: `{ material_id, action: "approve"|"reject", notes? }`
- Actualiza `curation_status`, `is_visible`, `curated_by`, `curated_at`

### `POST /api/create-payment-intent`
- Crea intent de pago en Stripe en COP

### `POST /api/reviews`
- Crea reseña de vendedor
- Valida que `reviewer_id !== seller_id`
- Maneja error 23505 (reseña duplicada)

## Contextos globales

### `UserContext`
```ts
const { profile, loading, refresh, signOut } = useUser();
// profile.is_admin — para verificar admin en cliente
// profile.is_seller — para mostrar opciones de vendedor
```

### `CartContext`
```ts
const { items, add, remove, clear, buyNow, total, count, has } = useCart();
// ⚠️ Sin persistencia — se pierde al recargar
```

## Patrones importantes

### Cliente Supabase
```ts
// ✅ En componentes cliente
import { supabase } from "@/lib/supabase";

// ✅ En API routes (servidor) — usar createClient directamente
import { createClient } from "@supabase/supabase-js";
const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});
```

### Proteger rutas admin
```ts
// En page.tsx del admin
const { profile, loading, isAdmin } = useAdminGuard();
if (guardLoading) return <Splash />;
if (!isAdmin) return null; // useAdminGuard ya redirige a /login
```

### Verificar admin en API route
```ts
// Patrón en todas las API routes de admin
const userClient = createClient(url, anonKey, {
  global: { headers: { Authorization: `Bearer ${token}` } },
});
const { data: { user } } = await userClient.auth.getUser();
const { data: profile } = await supabaseAdmin
  .from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
if (!profile?.is_admin) return 401;
```

## Pendientes / deuda técnica

- [ ] `CartContext` sin persistencia — agregar `localStorage` o tabla `cart_items`
- [ ] Descargas de archivos sin verificar compra — usar `createSignedUrl` de Supabase Storage
- [ ] `toggleVisibility` en `mis-publicaciones` permite activar sin aprobación del curador
- [ ] Tracking de descargas — columna `downloads` siempre en 0
- [ ] Función RPC `get_visible_materials` debe filtrar por `curation_status = 'approved'`
- [ ] Reemplazar todos los `any` en el código por tipos correctos

## Comandos

```bash
npm run dev      # Desarrollo con Turbopack
npm run build    # Build de producción
npm run lint     # ESLint
```

## Notas para IA

- **No usar Tailwind** — el proyecto usa CSS variables (`var(--gray-200)`, etc.)
- **No crear componentes separados de CSS/JS** — todo inline o en el mismo archivo
- **Los route groups `(admin)`, `(auth)`, `(dashboard)` no generan URLs** — son solo organizativos
- **La API de curator está en `/api/curator/` no `/api/admin/`** — Next.js tiene conflicto con el route group `(admin)`
- **Siempre reiniciar el servidor** después de cambiar `.env.local`
- **El usuario admin** se crea manualmente en Supabase Auth y se le asigna `is_admin = true` en la tabla `profiles`