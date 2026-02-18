# Run All Tests - Complete Verification

## Test 1: Check User Data
```bash
curl https://vita-whatsapp.vercel.app/api/check-user-data
```

**Expected Output**:
- User exists: true
- Food records count: X (number of photos you've sent)
- Profile: your profile data or null

---

## Test 2: Test All Commands
```bash
curl https://vita-whatsapp.vercel.app/api/test-commands-local
```

**Expected Output**:
- Success: true
- Summary: 8 commands tested
- You should receive 8 WhatsApp messages

**Check WhatsApp for**:
1. stats response
2. history response
3. profile response
4. help response
5. start response
6. settings response
7. /stats response
8. /history response

---

## Test 3: Manual WhatsApp Test

Send these messages on WhatsApp:

1. `stats` - Should show statistics or "no data yet"
2. `history` - Should show recent meals or "no history yet"
3. `profile` - Should show your profile or setup prompt
4. `help` - Should show help information
5. Send a food photo - Should get Singapore-style response with buttons
6. Click "Record" button - Should confirm recording
7. Send `stats` again - Should now show 1 meal
8. Send `history` again - Should show the meal you just recorded

---

## Test 4: Check Debug Logs
```bash
curl https://vita-whatsapp.vercel.app/api/debug-logs > debug.json
```

Look for:
- `text_message_processing` - Your messages being processed
- `command_recognized_result` - Commands being recognized
- Any errors

---

## Quick Test (All in One)

Run this to test everything at once:

```bash
# Check data
echo "=== Checking User Data ===" && curl -s https://vita-whatsapp.vercel.app/api/check-user-data | jq

# Wait 2 seconds
sleep 2

# Test all commands
echo "=== Testing All Commands ===" && curl -s https://vita-whatsapp.vercel.app/api/test-commands-local | jq

# Check WhatsApp now!
echo "=== Check your WhatsApp for messages! ==="
```

---

## If Tests Fail

1. Check if endpoints are deployed:
   ```bash
   curl https://vita-whatsapp.vercel.app/api/check-user-data
   ```
   If you get 404, wait 1-2 minutes for deployment.

2. Check debug logs:
   ```bash
   curl https://vita-whatsapp.vercel.app/api/debug-logs | jq '.logs[0:10]'
   ```

3. Try manual test on WhatsApp:
   - Send: `stats`
   - If it doesn't work, send: `/start`
   - Then try: `stats` again

---

## Success Criteria

✅ All commands work correctly
✅ Food photo recognition works
✅ Interactive buttons work
✅ Language detection works
✅ No timeout errors
✅ Singapore-style responses
✅ Stats show correct data
✅ History shows recent meals

---

## Current Status

- Code is deployed to: https://vita-whatsapp.vercel.app
- Test endpoints are ready
- Waiting for Vercel deployment to complete (~2 minutes)

**Next**: Run the tests above and report results!
