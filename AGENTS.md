# Agent Operating Rules — Herbal Line

## Mission
Build Herbal Line as a polished, testable web management game explicitly themed around the regulated medical-cannabis supply chain, from seed intake to pharmacy delivery. The player's scope ends at documented delivery; pharmacy dispensing and patient treatment are outside the simulation.

## Required working method
1. Inspect repository state, branch, working tree, scripts, and existing tests before editing.
2. Preserve established architecture unless a documented reason supports changing it.
3. Work in small, coherent, reviewable increments. Prefer reproducible scripts over manual-only procedures.
4. After each meaningful code change, run the narrowest relevant checks; before claiming completion, run the complete available validation suite.
5. Report exact commands, outcomes, known gaps, and any check that could not be run. Never fabricate test results, screenshots, commits, deployments, or CI status.
6. Do not overwrite unrelated work, rewrite shared history, expose credentials, or add secrets to files, logs, commits, or prompts.
7. Do not request approval for routine reversible work. Pause for destructive actions, paid resource activation, credential/security changes, or irreversible external effects.

## Domain boundaries
- Cannabis remains the named subject; do not silently replace it with a generic crop.
- Simulate the operational burden: staffing, capacity, plant-health observations, planning, inventory, batch genealogy, quality checks, compliance, incidents, waste accounting, budgets, and logistics.
- Use fictionalized and normalized gameplay variables. Do not encode real-world cultivation recipes, precise growing parameters, operational cultivation schedules, extraction/manufacturing procedures, or instructions intended to enable production outside the game.
- Medical information must be careful, sourced when presented as factual, and separated from fictional gameplay. Never present the game as medical advice or imply that a product is appropriate for a particular person.
- Avoid glamorizing intoxication or encouraging consumption. The player's objective is compliant operations and responsible delivery.

## Engineering quality
- Keep domain rules independent of UI and persistence.
- Validate state transitions and user input at system boundaries.
- Use deterministic simulation inputs where possible so bugs can be reproduced.
- Test happy paths, invalid transitions, edge cases, and save/load compatibility.
- Treat quality failures and compliance incidents as explicit states, not cosmetic warnings.
- Add accessibility, responsive layout, error states, and data migration considerations to the definition of done.

## Definition of done
A task is done only when implementation, relevant tests, documentation, and observed validation results agree. List remaining limitations explicitly. A green configuration file alone is not proof of a green pipeline.
