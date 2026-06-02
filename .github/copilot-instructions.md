# Copilot Instructions

Read `AGENTS.md` first. It is the canonical operating contract for VersaEnergy.

Use the relevant `docs/fase-NN.md` document before touching source code. Keep
the graph-first architecture: the canvas is the view, the semantic graph is the
truth. Do not introduce runtime mocks. Persist operational data in Supabase.

For DB/RLS/auth, unit conversion, balance logic, topology versioning or
cross-utility behavior, prefer clarification and senior review before edits.
