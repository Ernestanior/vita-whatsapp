# Real User Test Checklist

## 🎯 Purpose
Test EVERY feature as a real user would, not just automated tests.

## ❌ What Went Wrong
- Automated tests passed but real user test failed
- "stats" command triggered AI chat instead of showing statistics
- Root cause: Missing command keywords without "/" prefix

## ✅ Fixed
- Added "stats", "history", "help", "profile", "start", "settings" without "/" prefix
- Now both "/stats" and "stats" work

---

## 📋 Manual Test Checklist

### Test 1: Basic Commands (No Food Photos Yet)
- [ ] Send "hello" → Should get welcome message
- [ ] Send "start" → Should get welcome message
- [ ] Send "help" → Should get help information
- [ ] Send "profile" → Should say "No profile yet" or show profile
- [ ] Send "stats" → Should say "No statistics yet"
- [ ] Send "history" → Should say "No history yet"

### Test 2: Send First Food Photo
- [ ] Send food photo → Should get ONE acknowledgment
- [ ] Wait for processing → Should NOT timeout before 30s
- [ ] Get response → Should be Singapore-style (Singlish)
- [ ] Check buttons → Should see Record/Modify/Ignore
- [ ] Response language → Should be English (default)

### Test 3: Interactive Buttons
- [ ] Click "Record" → Should confirm and save
- [ ] Send another photo → Click "Modify" → Should ask what to modify
- [ ] Send another photo → Click "Ignore" → Should delete record

### Test 4: View History
- [ ] Send "history" → Should show recent meals with:
  - Food names
  - Calories
  - Health ratings (🟢🟡🔴)
  - Time ago

### Test 5: View Statistics
- [ ] Send "stats" → Should show:
  - Total meals count
  - Average calories per meal
  - Average protein/carbs/fat
  - Health rating distribution

### Test 6: Language Switching
- [ ] Send "你好" → Should switch to Chinese
- [ ] Send food photo → Response should be in Chinese
- [ ] Send "hello" → Should switch back to English
- [ ] Send food photo → Response should be in English

### Test 7: Profile Management
- [ ] Send "profile" → Should show current profile
- [ ] Send "25 170 65" → Should create/update profile
- [ ] Send "profile" again → Should show updated info

### Test 8: Multiple Photos
- [ ] Send 5 different food photos
- [ ] Each should process successfully
- [ ] Each should get Singapore-style response
- [ ] All should be saved to history

### Test 9: Error Handling
- [ ] Send unclear photo → Should handle gracefully
- [ ] Send text during processing → Should queue properly
- [ ] Send invalid command → Should use AI chat

### Test 10: Performance
- [ ] Processing time < 45 seconds
- [ ] No duplicate messages
- [ ] Timeout message in correct language
- [ ] All responses properly formatted

---

## 🧪 Test Results (To Be Filled)

### Test 1: Basic Commands
- hello: ⏳ Waiting for deployment
- start: ⏳ Waiting for deployment
- help: ⏳ Waiting for deployment
- profile: ⏳ Waiting for deployment
- stats: ⏳ Waiting for deployment
- history: ⏳ Waiting for deployment

### Test 2: First Photo
- Acknowledgment: ⏳ Waiting for deployment
- Processing time: ⏳ Waiting for deployment
- Response style: ⏳ Waiting for deployment
- Buttons: ⏳ Waiting for deployment

### Test 3: Buttons
- Record: ⏳ Waiting for deployment
- Modify: ⏳ Waiting for deployment
- Ignore: ⏳ Waiting for deployment

### Test 4: History
- Command works: ⏳ Waiting for deployment
- Shows meals: ⏳ Waiting for deployment
- Correct format: ⏳ Waiting for deployment

### Test 5: Statistics
- Command works: ⏳ Waiting for deployment
- Shows data: ⏳ Waiting for deployment
- Calculations correct: ⏳ Waiting for deployment

### Test 6: Language
- Chinese detection: ⏳ Waiting for deployment
- Chinese responses: ⏳ Waiting for deployment
- Switch back to English: ⏳ Waiting for deployment

### Test 7: Profile
- View profile: ⏳ Waiting for deployment
- Quick setup: ⏳ Waiting for deployment
- Update profile: ⏳ Waiting for deployment

### Test 8: Multiple Photos
- Photo 1: ⏳ Waiting for deployment
- Photo 2: ⏳ Waiting for deployment
- Photo 3: ⏳ Waiting for deployment
- Photo 4: ⏳ Waiting for deployment
- Photo 5: ⏳ Waiting for deployment

### Test 9: Errors
- Unclear photo: ⏳ Waiting for deployment
- Invalid command: ⏳ Waiting for deployment

### Test 10: Performance
- Processing time: ⏳ Waiting for deployment
- No duplicates: ⏳ Waiting for deployment
- Correct language: ⏳ Waiting for deployment

---

## 📝 Notes

### Issues Found
1. ❌ "stats" command triggered AI chat (FIXED)
2. ⏳ Other issues to be discovered...

### Fixes Applied
1. ✅ Added command keywords without "/" prefix

---

**Status**: Deployment in progress
**Next**: Wait for deployment, then test EVERY feature manually
**Goal**: 100% real user verification before claiming "done"
