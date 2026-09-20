# AI Workflow Kit - Engineering Governance

## Mandate: Atlas Authority Protocol
All architectural changes must align with the specifications issued by the **Specification Authority** (./specs).

## Ternary Architecture
- **Root:** Orchestration and config.
- **.ai-workflow/:** Implementation (The Muscle).
- **./specs:** Specifications (The Brain).

## Branch Gates
- **main Branch:** READ-ONLY.
- **Validation:** Merges require successful observed validation; full/release workflows may persist EVIDENCE.json.

## Primary Agents
- **Atlas (Orchestrator)**
- **Orion (Strategist)**
- **Sage (Auditor)**
- **Nexus (Spec Architect)**
- **Astra (Developer)**
- **Phoenix (Healer)**

## Operational Preferences
- Use `token-economy` and `minimal-context` skills.
- **Native Discovery**: This project uses workspace-specific extensions in `.agents/`.
- **Workflow Entry**: Use `/atlas` to begin any task.
