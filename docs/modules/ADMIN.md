# Modulo: Administracion

## Responsabilidad

Configuracion central del sitio: sitios, usuarios, roles, tarifas, factores
de emision y parametros del sistema. Es el prerequisito para que los modulos
operativos funcionen con datos reales.

## Archivos clave

| Responsabilidad | Archivo |
|-----------------|---------|
| Modulo UI (entry) | `src/modules/admin/index.tsx` |
| Vista Sitios | `src/modules/admin/views/SitesView.tsx` |
| Vista Tarifas | `src/modules/admin/views/RatesView.tsx` |
| Vista Usuarios | `src/modules/admin/views/UsersView.tsx` |
| Vista Parametros | `src/modules/admin/views/SettingsView.tsx` |

## Modelo/Tablas

- `app_memberships` — roles por aplicacion (Admin, Gestor energetico,
  Tecnico, Visor).
- `energy_tariffs` — tarifas por utility y periodo.
- `energy_emission_factors` — factores de emision por utility.
- `energy_system_parameters` — parametros del sistema (umbrales, defaults).
- `sites` — sedes (tabla compartida con CMMS).

Migracion: `00014_admin_settings.sql`.

## Flujo actual

1. Layout de 4 tabs: Sitios y Organizacion, Tarifas y Energia, Usuarios y
   Roles, Parametros del Sistema.
2. Cada tab tiene formularios y tablas editables.

Estado actual: la estructura de base de datos esta completa. La UI tiene
datos mock en frontend pendiente de conexion a Supabase JS.

## Invariantes

- RLS por empresa en todas las tablas.
- `app_memberships` gobierna autorizacion de Energy (no se usa
  `profiles.role` del CMMS).
- Tarifas tienen vigencia por periodo.
- Factores de emision tienen utility y unidad.
- Parametros de sistema tienen defaults sensatos.

## Permisos

- Visible solo para rol Admin.
- Escritura: solo Admin.

## Integraciones

- Cockpit: estado de configuracion incompleta.
- Balances: tarifas para costo estimado.
- Desempeno: factores de emision para CO2e.
- SGEn: parametros de scoring de SEUs.

## No hacer

- No exponer Admin a roles no-admin.
- No crear tarifas sin vigencia.
- No usar `profiles.role` del CMMS como autorizacion de Energy.

## Verificacion recomendada

- Cambio frontend: `npm run build`.
- Cambio de migracion: verificar RLS.
