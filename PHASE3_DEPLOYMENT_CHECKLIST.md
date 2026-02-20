# Phase 3 Deployment Checklist

## Pre-Deployment

### 1. Database Migration ⚠️ CRITICAL

- [ ] Open Supabase Dashboard SQL Editor
- [ ] Copy contents of `migrations/011_phase3_personalization_gamification.sql`
- [ ] Run migration in SQL Editor
- [ ] Verify all tables created successfully:
  - [ ] `user_preferences` (enhanced)
  - [ ] `daily_budgets`
  - [ ] `user_streaks` (enhanced)
  - [ ] `reminders`
  - [ ] `food_records` (enhanced)
  - [ ] `visual_cards`
  - [ ] `feature_discovery`
  - [ ] `user_engagement_metrics`

### 2. Code Verification

- [x] All Phase 3 services implemented
- [x] Command handler created
- [x] Text handler updated with Phase 3 commands
- [x] Image handler calls Phase 3 services
- [x] Response formatter includes Phase 3 data
- [x] No TypeScript errors

### 3. Environment Variables

- [ ] Verify all existing env vars are set
- [ ] No new env vars required for Phase 3

## Testing

### 4. Local Testing

- [ ] Start dev server: `npm run dev`
- [ ] Run integration test: `node test-phase3-user-journey.mjs`
- [ ] Or visit: `http://localhost:3000/api/test-phase3-integration`
- [ ] Verify all services initialize correctly

### 5. Manual WhatsApp Testing

- [ ] Send food photo → Check streak appears
- [ ] Send `streak` command → View stats
- [ ] Send `budget set 1800` → Enable budget
- [ ] Send food photo → Check budget updates
- [ ] Send "I'm vegetarian" → Check preference extraction
- [ ] Send `preferences` → View learned preferences
- [ ] Send `help` → Verify Phase 3 commands listed

## Deployment

### 6. Deploy to Production

- [ ] Commit all changes
- [ ] Push to repository
- [ ] Deploy to Vercel/production
- [ ] Verify deployment successful

### 7. Production Database

- [ ] Run migration on production database
- [ ] Verify tables created
- [ ] Check RLS policies are active

### 8. Production Testing

- [ ] Test with real WhatsApp number
- [ ] Send food photo
- [ ] Verify streak tracking works
- [ ] Test all commands
- [ ] Monitor error logs

## Post-Deployment

### 9. Monitoring

- [ ] Check Vercel logs for errors
- [ ] Monitor Supabase database performance
- [ ] Track Phase 3 feature usage
- [ ] Monitor user engagement metrics

### 10. User Communication

- [ ] Announce new features to users
- [ ] Provide command examples
- [ ] Gather user feedback

## Rollback Plan

If issues occur:

1. Phase 3 features are non-breaking
2. Errors are caught and logged
3. Main meal logging flow continues to work
4. Can disable Phase 3 by commenting out service calls in image-handler.ts

## Success Criteria

- [ ] No errors in production logs
- [ ] Streak tracking works across days
- [ ] Budget tracking updates correctly
- [ ] Commands respond properly
- [ ] Feature discovery triggers at right times
- [ ] User engagement increases

## Notes

- Phase 3 features are opt-in (budget tracking)
- Features introduced progressively (day 3, 7, 14)
- All errors are non-blocking
- Maximum 3 info points per response (simplicity)

---

**Status**: Ready for deployment after database migration

**Estimated Time**: 30 minutes (including testing)

**Risk Level**: Low (non-breaking changes)
