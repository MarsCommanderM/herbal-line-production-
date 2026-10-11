# Herbal Line — Master Production Plan

## 1. Product vision
Build a detailed, systems-led management game that helps players appreciate the labor, coordination, documentation, quality discipline, and regulatory burden involved in a fictional medical-cannabis operation. The central fantasy is running a reliable and accountable organization—not consuming a product.

## 2. Player journey
1. **Seed intake and provenance:** register incoming material, supplier records, identifiers, and acceptance decisions.
2. **Production planning:** allocate rooms, staff, capacity, equipment availability, and work orders using abstract in-game values.
3. **Plant-care operations:** review simulated observations, assign staff tasks, respond to status changes, and manage resource constraints.
4. **Harvest planning:** schedule work against capacity and operational readiness, represented through fictional game indicators.
5. **Post-harvest workflow:** route batches through abstract workstations and queues without real-world processing recipes or procedural instructions.
6. **Quality assurance:** inspect records, review fictional test outcomes, place batches on hold, investigate deviations, and document release or rejection.
7. **Packaging and inventory:** manage approved stock, identifiers, expiry-like game metadata, stock rotation, and reconciliation.
8. **Pharmacy delivery:** allocate orders, prepare compliant dispatch records, manage transport capacity and delivery windows, and capture proof of delivery.
9. **Business development:** invest in training, capacity, maintenance, software, audit readiness, and resilience.

## 3. Core simulation loop
Observe state → prioritize work → allocate staff and capacity → execute abstract work orders → review quality/compliance outcomes → reconcile inventory and finances → plan the next shift.

A decision should have a visible cost, risk, or opportunity. Avoid arbitrary penalties: show the reason for a blocked action and how the player can resolve it within the game.

## 4. Primary systems
- **Facility:** rooms, capacity, availability, maintenance, access roles.
- **Workforce:** roles, skills, shift coverage, fatigue represented abstractly, training, handovers.
- **Production:** work orders, stage status, queue capacity, dependencies, exceptions.
- **Quality:** inspections, sample/test result records as fictional data, hold/release/reject decisions, corrective actions.
- **Compliance:** checklists, audits, document expiry, deviations, access logs, chain of custody.
- **Inventory:** lots, movements, reservations, reconciliation, quarantines, write-offs.
- **Logistics:** orders, picking, dispatch, delivery windows, transport capacity, failed-delivery recovery.
- **Finance:** operating costs, payroll, maintenance, waste costs, revenue abstractions, cash runway.
- **Research and training:** unlocks that improve information quality, staff competence, resilience, and process efficiency without conveying real production recipes.

## 5. State integrity
All meaningful actions should be represented as validated commands that produce domain events. A batch must not be dispatched unless it is in an eligible released state; a held or rejected batch cannot silently re-enter available inventory. Inventory changes must be traceable to a recorded event. Save data must be versioned and validated on load.

## 6. UX principles
- Clear operational dashboard with urgent exceptions first.
- Timeline and queue views for work in progress.
- Batch genealogy view connecting intake, work orders, quality records, inventory movements, and delivery.
- Explainable status indicators; color is never the only signal.
- Contextual tutorials and optional notices rather than repeated intrusive popups.
- Responsive, keyboard-accessible UI with readable typography and explicit empty/error/loading states.

## 7. Content and medical framing
Cannabis remains explicit in the fictional setting. Educational notices may explain that medical use is regulated, evidence varies by condition and product, and clinical decisions belong with qualified health professionals. The game must not offer diagnosis, dosage advice, treatment recommendations, or claims that a fictional product treats a real condition. See CONTENT_AND_HEALTH_NOTICES.md.

## 8. Non-goals
- Real-world cultivation recipes, exact growing parameters, or optimized cultivation calendars.
- Real extraction, manufacturing, drying, curing, or preparation procedures.
- Consumer instructions, intoxication challenges, or recreational-use encouragement.
- Medical diagnosis, prescriptions, dosage recommendations, or claims of guaranteed therapeutic benefit.
- Simulating pharmacy dispensing or advising patients after delivery.

## 9. MVP acceptance criteria
- A new game can be started and saved locally.
- The player can register an intake lot, create a work order, assign staff, and move it through fictional stages.
- A quality hold blocks dispatch and is visible in the dashboard.
- A released lot can be allocated to an order and delivered with traceable events.
- Invalid transitions are rejected with useful explanations.
- Reloading restores a versioned, validated save.
- Domain tests cover valid and invalid transitions, batch traceability, stock reconciliation, and save/load.
- CI installs from a lockfile and runs lint, type-check, unit tests, and production build.
- Any claimed passing result links to an actual run or recorded command output.

## 10. Production gates
**Gate A — Foundation:** repository conventions, type-safe domain model, CI, deterministic test harness.

**Gate B — Vertical slice:** intake → work order → fictional production stages → quality hold/release → inventory → pharmacy dispatch.

**Gate C — Usability:** tutorial, accessible dashboard, clear errors, responsive layout, save/load recovery.

**Gate D — Content and balancing:** onboarding, contextual educational notices, economy tuning using fictional values, incident scenarios.

**Gate E — Release candidate:** regression tests, accessibility review, dependency/security review, backup/migration test, documented known issues.

No gate is considered passed merely because its checklist exists.
