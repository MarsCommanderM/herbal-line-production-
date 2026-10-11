# Herbal Line

**Herbal Line** is a systems-driven web management game about the regulated medical-cannabis supply chain, following a fictional operation from seed intake and plant-care planning through harvest scheduling, quality assurance, batch documentation, inventory, and delivery to pharmacies.

The player manages the operation; what pharmacies subsequently do with dispensed products is outside the game's scope. The design focuses on work, care, traceability, staff, compliance, operational trade-offs, and the consequences of decisions—not intoxication or recreational consumption.

## Product principles

- **Cannabis remains the explicit subject.** The project is not a generic plant-management reskin.
- **Systems depth over real-world recipes.** Production stages use fictional, normalized simulation values and abstract actions. The game does not provide actionable cultivation parameters, real schedules, nutrient recipes, extraction instructions, or procedures for producing or preparing cannabis.
- **Regulation is gameplay.** Documentation, audits, quarantines, quality checks, incident handling, and traceability affect the player's outcomes.
- **Medical context is presented responsibly.** Educational notices distinguish research, approved medical use, uncertainty, and individual clinical decisions. The game does not diagnose, prescribe, or make treatment recommendations.
- **Evidence before claims.** CI status, tests, and release readiness must be demonstrated by actual runs; never infer success from configuration alone.

## Project status

This repository is being initialized. Until implementation and CI runs are recorded, no build or test result should be considered verified.

## Planned stack

TypeScript, Vite, React, Vitest, and Playwright, with domain logic separated from UI and persistence. The initial MVP is a playable 2D management interface; 3D presentation is not a prerequisite for proving the management loop.

## Documentation

- [Master production plan](docs/MASTER_PRODUCTION_PLAN.md)
- [MVP roadmap](docs/ROADMAP.md)
- [Content, age rating and health notices](docs/CONTENT_AND_HEALTH_NOTICES.md)
- [Agent rules](AGENTS.md)

## Getting started

Implementation setup commands will be added with the first application scaffold. Do not report the project as runnable until dependencies are installed and the defined validation commands have actually passed.

## Rights and credits

See [RIGHTS_NOTICE.md](RIGHTS_NOTICE.md). All fictional game data and simulation values are design abstractions, not real-world production guidance.
