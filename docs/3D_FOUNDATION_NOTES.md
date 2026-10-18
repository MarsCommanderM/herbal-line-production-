# 3D Foundation Notes

**Branch:** `fix/remove-botanical-scope-medical-cannabis`

## Current state

- Third-person character with WASD + mouse look and camera follow.
- Procedural cannabis plants with layered fan leaves, buds and secondary branches.
- Proximity-based plant actions (keys 1–4): prune, cutting, plant, repot.
- Visual state changes on prune and repot.
- All values and visuals are fictional game balance.

## Limitations

- No final art models or textures.
- No skeletal animation.
- No physics-driven interaction (Rapier is declared but unused in the slice).
- No persistent plant state across saves beyond the domain model.

## Next for production art

- Replace procedural geometry with licensed glTF assets.
- Add idle/walk and interaction animations.
- Integrate plant actions with domain commands where appropriate.

