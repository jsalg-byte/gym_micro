# Gym-Micro Feedback Execution TODO (Human-in-Loop)

## Current Snapshot (2026-03-08)
- [x] Branch created: `codex/feedback-workout-nutrition-ux`
- [x] Multi-ingredient meal builder (grams-based) is implemented
- [x] Nutrition calendar opens daily modal with foods, macros, formulas, and images
- [x] Barcode camera scan flow added in Add Food
- [x] Routine UX wording updated to Workout Plans + onboarding explainer
- [x] Lint + production build pass locally

## Remaining Human-In-Loop Checks

1. Workout Plan clarity check
- [ ] You review `/routines` and `/sessions` wording and confirm “Workout Plan” is clearer than “Routine”
- [ ] You confirm onboarding blurb is enough (or request tighter copy)

2. Nutrition flow acceptance check
- [ ] You test: add food -> build meal with multiple ingredients -> save
- [ ] You confirm per-item and total macro math looks correct
- [ ] You confirm the calendar modal layout is understandable on mobile

3. Barcode camera check (device/browser specific)
- [ ] You test camera scan on your primary phone browser
- [ ] You test Firefox desktop fallback (manual barcode entry still works)
- [ ] You confirm whether auto-lookup after scan feels right

4. Storage/photo check for meals
- [ ] You upload meal photos and verify they render in the day modal
- [ ] You confirm no CORS/network errors in browser console

5. Admin access check
- [ ] You sign in with your admin identity and confirm `Admin` nav link is visible
- [ ] You verify user CRUD + IP visibility in `/admin`

## Next Build Targets (after your checks)
- [ ] Add OCR nutrition label scanner fallback (photo -> OCR -> macro parse)
- [ ] Add rest timer UI on session detail
- [ ] Add progression/PR widgets (weight trends + personal records)
- [ ] Tighten fast-log UX to “scan -> grams -> save” in minimum taps

## Wrap-Up Criteria
- [ ] Feedback branch accepted after your manual QA on key flows
- [ ] Deploy to Coolify and confirm production parity
- [ ] Create merge PR to main with release notes
