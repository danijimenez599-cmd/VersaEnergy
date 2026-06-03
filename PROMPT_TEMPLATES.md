# PROMPT_TEMPLATES.md

Use these templates when asking AI agents to work on VersaEnergy.

## 1. Natural Request To Technical Brief

```text
I want to ask this in natural language. Convert it into a technical brief before editing.

Request:
<describe what you want naturally>

Priority:
<minimum risk / highest quality / speed / minimum cost>

If information is missing:
- Ask me at most 1 to 3 concrete questions.
- Do not ask me for file names if AGENTS.md and docs/modules/<MODULE>.md can infer them.
- If the risk is low and reversible, proceed with explicit assumptions.

Before editing, provide:
- Goal.
- Likely module.
- Acceptance criteria.
- Docs/files to read.
- Risks.
- Blocking questions, if any.
- Verification.
```

## 2. Module Implementation

```text
Work on VersaEnergy using AGENTS.md.

Module/task:
<module or task>

Scope:
<known module/files if known>

Rules:
- Read AGENTS.md first.
- Read docs/modules/<MODULE>.md for the affected module.
- Read docs/04_CURRENT_STATE_REFERENCE.md and docs/05_MASTER_IMPROVEMENT_PLAN.md.
- No runtime mocks.
- Persist operational data in Supabase.
- Keep calculations in src/services/.
- Escalate graph semantics, unit conversion, DB/RLS/auth and versioning decisions.

Verification:
- npm run build.
- Update docs per docs/VERIFY.md.
```

## 3. Review Without Editing

```text
Review VersaEnergy without editing files.

Scope:
<module/files/diff>

Look for:
- graph-first violations;
- runtime mocks;
- utility-type assumptions;
- unit conversion risks;
- RLS/auth/schema risks;
- React components doing service calculations;
- docs inconsistent with current state.

Return findings first, ordered by severity, with file/line references.
```

## 4. Only Plan

```text
Only make a plan. Do not edit files.

Task:
<what I want>

Include:
- docs/modules/ to read;
- probable files;
- risks;
- acceptance criteria;
- verification commands.
```
