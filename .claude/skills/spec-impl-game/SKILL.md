---
name: spec-impl-game
description: Same as /spec-impl (implements an approved spec step by step), but for game specs. When the implementation ends, it launches the skin-dessigner agent and then, once that one is done, the game-porter agent (mobile audit), one after the other.
disable-model-invocation: true
argument-hint: <NN-spec-name | folder/NN-spec-name>
allowed-tools: Read, Glob, Grep, Edit, Write, Agent, AskUserQuestion, Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(git log:*), Bash(git diff:*), Bash(git stash:*), Bash(cat:*), Bash(ls:*)
---

# /spec-impl-game — spec-impl + skins + mobile audit

## Session context

Current repository state:
!`git status --short`

Current branch:
!`git branch --show-current`

Specs available (including subfolders):
!`ls -R specs/ 2>/dev/null || echo "The specs/ folder does not exist"`

Branch-creation config:
!`cat specs/.spec-config.yml 2>/dev/null || echo "AutoCreateBranch: true (default, no config file)"`

---

## Instructions

The received argument is: `$ARGUMENTS`

### Step A — Run /spec-impl

Read `C:/Users/Usuario/.agents/skills/spec-impl/SKILL.md` and follow its four phases **exactly** (identify the spec, validate "Approved", create the branch, implement step by step with pauses, never commit). Use the session context above instead of its `!` blocks.

Only difference in Phase 1: the spec may live in a subfolder (`specs/frogger/01-frogger-core.md`, `specs/game-jam/<id>/01-...md`). Search subfolders too, and accept a path, number or slug. The branch name still comes from the file name only (`01-frogger-core` → `spec-01-frogger-core`).

If spec-impl stops at any point (not approved, user declines, ambiguity), **stop here too**: do not run Step B.

### Step B — Audit agents (only after "✅ All steps of the plan are implemented")

Run these **sequentially, never in parallel**. Wait for the first to finish before launching the second.

1. Launch `Agent` with `subagent_type: "skin-dessigner"`. Prompt: name the game just implemented, the spec file and the branch, and ask it to ensure the game has exactly the three skins (`clasico`, `neon`, `retro`). Summarize its result to the user.
2. Only after that, launch `Agent` with `subagent_type: "game-porter"` (the mobile/gamepad audit agent). Prompt: same game/spec/branch context, and ask it to audit desktop + mobile (touch gamepad, responsive canvas, no horizontal scroll). Summarize its result.

Agents are autonomous: put everything they need in the prompt; do not tell them to read `specs/`.

### Step C — Close

Do not commit. Tell the user to verify the acceptance criteria one by one, then set the spec's status to "Implemented" and commit before merging.
