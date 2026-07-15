## Summary

- What changed?
- Why did it change?

## Scope

- [ ] Backend
- [ ] Frontend
- [ ] Docs
- [ ] Infrastructure/CI

## Testing

List exactly what you ran and the outcome.

### Backend

- [ ] `cd backend && npm run lint`
- [ ] `cd backend && npm run build`
- [ ] `cd backend && npm test`
- [ ] `cd backend && npm run test:integration` (required for DB/auth/data-flow changes)

### Frontend

- [ ] `cd frontend && npm run lint`
- [ ] `cd frontend && npm run build`
- [ ] `cd frontend && npm test`

### Docs

- [ ] `cd docs-site && npm run docs:generate` (required for API schema/docs changes)

## Risk And Rollout

- Risk level: Low / Medium / High
- Any migration or env var changes?
- Rollback plan (if needed):

## Screenshots / Recordings

Include before/after screenshots for UI changes.

## Review Notes

- Areas where you want extra reviewer attention:
- Known tradeoffs or follow-ups:

## Checklist

- [ ] Branch is focused and scoped to one change area
- [ ] Tests added/updated for behavior changes
- [ ] Privacy/auth/ownership paths considered where relevant
- [ ] No secrets or credentials committed
- [ ] Related docs updated (`CONTRIBUTING.md`, `TESTING.md`, README/docs links)
