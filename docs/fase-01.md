# Fase 1 — App Shell + Auth + Multi-tenant

## Estado

✅ **Completada** — 2026-06-01

---

## Visión general

La Fase 1 construye el contenedor de la aplicación: sistema de autenticación Supabase, shell visual con sidebar + header, routing protegido, y contexto multi-tenant (company + site + utility filter). Todos los módulos de negocio muestran placeholders.

---

## Arquitectura del módulo

### Flujo de autenticación

```
Usuario → LoginPage/RegisterPage → signIn/signUp → Supabase Auth
  → trigger handle_new_user → profiles table
  → AuthProvider detecta sesión → carga profile + company
  → ProtectedRoute permite acceso a AppShell
```

### Provider hierarchy

```
BrowserRouter
  └── AuthProvider (context: session, user, profile, loading)
        └── Routes
              ├── /login    → AuthPage (mode=login)    [PublicRoute]
              ├── /register → AuthPage (mode=register) [PublicRoute]
              └── /         → AppShell                  [ProtectedRoute]
                    ├── index          → InicioPage
                    ├── mapa           → MapaPage
                    ├── modelo         → ModeloPage
                    ├── medicion       → MedicionPage
                    ├── balances       → BalancesPage
                    ├── desempeno      → DesempenoPage
                    ├── acciones       → AccionesPage
                    ├── iso50001       → Iso50001Page
                    ├── reportes       → ReportesPage
                    └── admin          → AdminPage
```

---

## Archivos creados

### Componentes base (`src/shared/`)

| Componente | Props clave | Notas |
|-----------|-------------|-------|
| `Button` | `variant` (primary/secondary/ghost/danger), `loading`, `leftIcon`, `rightIcon` | Loading state con spinner animado |
| `Badge` | `color` (blue/teal/orange/purple/cyan/red/gray/green), `variant` (solid/soft) | Colores alineados con design tokens |
| `Card` | `padding` (none/sm/md/lg), `onClick` | Si tiene onClick se vuelve interactivo (cursor, hover, a11y) |
| `MetricCard` | `label`, `value`, `unit`, `icon`, `trend`, `color` | Trend con flecha y %; icono con color de acento |
| `Modal` | `open`, `onClose`, `title`, `description`, `size` | Backdrop blur, cierra con Escape, bloquea scroll |
| `PageHeader` | `title`, `description`, `actions`, `breadcrumbs` | Breadcrumbs navegables con separadores |
| `EmptyState` | `icon`, `title`, `description`, `action` | Icono por defecto Inbox de Lucide |

### Autenticación (`src/services/auth.ts` + `src/app/AuthProvider.tsx`)

**`src/services/auth.ts`:**
- `signUp(email, password, fullName?)` — registra en Supabase Auth + guarda full_name en metadata
- `signIn(email, password)` — login con email/password
- `signOut()` — cierra sesión
- `onAuthStateChange(callback)` — suscripción a cambios de sesión

**`AuthProvider`:**
- Contexto: `{ session, user, profile, loading }`
- `profile` se carga de la tabla `profiles` filtrando por `auth_id`
- Maneja loading state mientras verifica sesión
- Cleanup en unmount con `cancelled` flag para evitar state updates en componentes desmontados

**`AuthPage`:**
- Componente unificado para login y register (prop `mode`)
- Manejo de errores con display en UI
- Links de navegación entre login ↔ register
- Validación HTML5 (required, minLength, type=email)

### AppShell (`src/app/AppShell.tsx`)

Layout principal con tres zonas:

1. **Sidebar izquierda** (colapsable, 240px / 68px):
   - Logo VE + nombre de app
   - Navegación desde `MODULES` registry con `NavLink` (active state azul)
   - Iconos Lucide mapeados por nombre
   - Botón de colapso en el footer

2. **Header superior** (56px):
   - Botón hamburguesa (visible en mobile)
   - Selector de utility type (dropdown con 10 opciones)
   - Placeholder "Selecciona un sitio" (se implementa en Fase 2)
   - Menú de usuario (avatar con inicial, email, logout)

3. **Área de contenido**:
   - `<Outlet />` de react-router-dom renderiza el módulo activo
   - Padding: p-6, scrollable

### Router (`src/app/router.tsx`)

- `ProtectedRoute`: redirige a `/login` si no hay sesión
- `PublicRoute`: redirige a `/` si ya hay sesión (evita ver login estando autenticado)
- Code-splitting con `React.lazy` + `Suspense` por módulo
- Cada módulo genera su propio chunk en el build

### Módulos placeholder (`src/modules/<modulo>/index.tsx`)

Cada módulo exporta un componente default con:
- `PageHeader` con título y descripción del módulo
- `EmptyState` con icono representativo y mensaje de "en construcción"
- Inicio tiene un skeleton de 4 MetricCards (placeholder visual)

### Zustand store (`src/store/uiStore.ts`)

Estado global de UI:
- `sidebarOpen` — controla colapso del sidebar
- `activeModule` — módulo activo actual
- `selectedSiteId` — sitio seleccionado (null = sin seleccionar)
- `selectedUtilityType` — filtro de utility activo

### Migración (`supabase/migrations/00001_sites.sql`)

- `sites`: id, company_id FK, name, code, address, timezone, is_active, timestamps
- `site_access`: profile_id PK + site_id PK (relación muchos-a-muchos)
- RLS: SELECT por company, ALL solo admin

---

## Decisiones de diseño

1. **Code-splitting por módulo**: cada módulo es un `React.lazy` import. En producción, solo se carga el JS del módulo activo. Los chunks son de ~0.5KB cada uno.

2. **AuthProvider como wrapper**: el contexto de autenticación envuelve toda la app. Cualquier componente puede usar `useAuth()` para acceder a `session`, `user`, `profile`.

3. **PublicRoute / ProtectedRoute**: componentes de guarda que evitan flashes de contenido. Muestran loader mientras se verifica la sesión.

4. **Sidebar desde MODULES registry**: añadir un nuevo módulo solo requiere agregarlo en `src/modules/index.ts` y crear su archivo `index.tsx`. No hay que tocar el sidebar.

5. **Filtro de utility global**: el `<select>` del header persiste en Zustand. En fases futuras, todos los módulos pueden leer `selectedUtilityType` para filtrar sus datos.

---

## Cómo extender

### Añadir un nuevo módulo

1. Agregar entrada en `src/modules/index.ts`:
```ts
{ id: 'nuevo-modulo', label: 'Nuevo Módulo', path: '/nuevo-modulo', icon: 'Zap' }
```

2. Crear `src/modules/nuevo-modulo/index.tsx` con un default export

3. Agregar ruta y lazy import en `src/app/router.tsx`

### Implementar un módulo existente

Reemplazar el placeholder en `src/modules/<modulo>/index.tsx` con la implementación real. No es necesario modificar el router.

### Añadir variantes de componentes

- **Button**: añadir entrada en `variantStyles` y tipo en `ButtonVariant`
- **Badge**: añadir color en `solidStyles` y `softStyles`

---

## Criterios de aceptación

- [x] Sidebar colapsable con módulos desde `moduleRegistry`
- [x] Login/registro funcional con Supabase Auth
- [x] Sesión persistente (refresh token)
- [x] Rutas protegidas redirigen a login
- [x] Selector de utility type en header
- [x] Navegación entre módulos funcional
- [x] Cada módulo muestra placeholder con nombre e icono
- [x] Diseño usa Tailwind con tokens de AGENTS.md
- [x] Code-splitting por módulo (chunks separados en build)
- [x] Migración `sites` + `site_access` aplicada con RLS
- [x] `npm run build` funciona
