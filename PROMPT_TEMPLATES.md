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
- Do not ask me for file names if AGENTS.md and docs/fase-NN.md can infer them.
- If the risk is low and reversible, proceed with explicit assumptions.

Before editing, provide:
- Goal.
- Likely phase/module.
- Acceptance criteria.
- Docs/files to read.
- Risks.
- Blocking questions, if any.
- Recommended model class.
- Verification.
```

## 2. Phase Implementation

```text
Work on VersaEnergy using AGENTS.md and codex.delegation.toml.

Phase/task:
<phase or task>

Scope:
<known module/files if known>

Rules:
- Read AGENTS.md first.
- Read the relevant docs/fase-NN.md.
- No runtime mocks.
- Persist operational data in Supabase.
- Keep calculations in src/services/.
- Escalate graph semantics, unit conversion, DB/RLS/auth and versioning decisions.

Verification:
- npm run build.
- npm run lint if the change is broad or touches shared code.
```

## 3. Review Without Editing

```text
Review VersaEnergy without editing files.

Scope:
<phase/module/files/diff>

Look for:
- graph-first violations;
- runtime mocks;
- utility-type assumptions;
- unit conversion risks;
- RLS/auth/schema risks;
- React components doing service calculations;
- docs inconsistent with current phase status.

Return findings first, ordered by severity, with file/line references.
```

## 4. Only Plan

```text
Only make a plan. Do not edit files.

Task:
<what I want>

Include:
- docs to read;
- probable files;
- risks;
- subtasks suitable for cheap workers;
- acceptance criteria;
- verification commands.
```
