# Skills + AGENTS.md Orchestrator — Design

**Date:** 2026-06-09  
**Status:** Approved  
**Scope:** Scaffold only; skills added incrementally by the team.

## Goal

Add a project-local skills system where `AGENTS.md` at the repo root acts as a lightweight orchestrator: it indexes installed skills under `skills/` without duplicating their instructions.

## Decisions

| Topic | Decision |
|-------|----------|
| Initial scope | Empty scaffold + template; no domain skills yet |
| Skills location | `skills/<skill-name>/SKILL.md` at repo root |
| AGENTS.md location | Repo root (`AGENTS.md`) |
| Orchestration depth | Index only: path + one-line description per skill |
| Cursor `.cursor/skills/` | Not used; avoid duplication |

## Architecture

```
ContextForge/
├── AGENTS.md
└── skills/
    ├── README.md
    └── _template/
        └── SKILL.md
```

**Agent flow:**

1. Read `AGENTS.md` when entering the project.
2. Match the user task to a skill description in the index.
3. Open `skills/<name>/SKILL.md` and follow its instructions.

Cursor does not auto-discover skills outside `.cursor/skills/`. The orchestrator index is the entry point.

## AGENTS.md format

`AGENTS.md` contains:

- A short preamble (orchestrator role, not a rule dump).
- A table: Skill | Path | Description.
- A "Register a skill" checklist (create folder, copy template, update index).

No routing tables, priorities, or duplicated workflow steps from `SKILL.md` files.

## Skill conventions

Each skill is a folder:

```
skills/<skill-name>/
├── SKILL.md          # Required — frontmatter + instructions
├── reference.md      # Optional
└── examples.md       # Optional
```

**Naming:** lowercase, hyphens, max 64 chars (e.g. `mcp-tools`, `postgres-migrations`).

**Frontmatter (required):**

```yaml
---
name: skill-name
description: Third-person summary with WHAT and WHEN triggers.
---
```

**Template:** `skills/_template/SKILL.md` is copied when creating a new skill.

## Adding a skill (checklist)

1. Copy `skills/_template/` → `skills/<skill-name>/`.
2. Edit `SKILL.md` frontmatter and body.
3. Add a row to the table in `AGENTS.md`.
4. Commit skill folder + `AGENTS.md` update together.

## Out of scope (YAGNI)

- Symlinks into `.cursor/skills/`
- Auto-generation of the index
- Routing / priority rules in `AGENTS.md`
- Personal skills (`~/.cursor/skills/`) — not listed in project index

## Success criteria

- New contributor can add a skill in under 5 minutes using README + template.
- `AGENTS.md` stays under ~50 lines until many skills exist.
- No instruction duplication between `AGENTS.md` and individual skills.
