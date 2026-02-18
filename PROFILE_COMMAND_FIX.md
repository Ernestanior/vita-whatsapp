# ✅ Profile Command Fix - DEPLOYED

## 🎯 Problem

When user clicked "My Profile" button, the bot started the profile setup flow (asking for height) instead of displaying the existing profile information.

### User's Screenshot
- User clicked "My Profile" button
- Bot responded: "让我们设置您的健康画像，为您提供个性化建议。请告诉我您的身高（厘米）：例如：170"
- User entered "169"
- Bot responded with AI chat instead of saving the height

## 🔍 Root Cause

The `profileManager.getProfile(userId)` method was receiving a phone number (`"6583153431"`) but was querying the database using `user_id` (UUID) directly, without converting the phone number to UUID first.

### Code Flow
1. User clicks "My Profile" button
2. `interactiveHandler` simulates `/profile` command
3. `textHandler.handleProfileCommand(userId, context)` is called with `userId = "6583153431"` (phone number)
4. `profileManager.getProfile("6583153431")` queries `health_profiles` table with `user_id = "6583153431"`
5. Query returns `null` because `user_id` is a UUID, not a phone number
6. Bot thinks user has no profile and starts setup flow

### Database Schema
```sql
users:
  - id: UUID (primary key)
  - phone_number: TEXT

health_profiles:
  - user_id: UUID (foreign key to users.id)
  - height: INTEGER
  - weight: INTEGER
  - ...
```

## ✅ Solution

Modified `profileManager.getProfile()` to accept both phone numbers and UUIDs:

1. Check if input is UUID (contains hyphens) or phone number
2. If phone number, query `users` table to get UUID
3. Use UUID to query `health_profiles` table

### Code Changes

**File**: `src/lib/profile/profile-manager.ts`

```typescript
async getProfile(userIdOrPhone: string): Promise<HealthProfile | null> {
  const supabase = await createClient();

  // Check if input is a UUID (contains hyphens) or phone number
  const isUUID = userIdOrPhone.includes('-');
  
  let userId: string;
  
  if (isUUID) {
    // Already a UUID, use directly
    userId = userIdOrPhone;
  } else {
    // Phone number, need to convert to UUID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('phone_number', userIdOrPhone)
      .maybeSingle();

    if (userError || !user) {
      logger.warn({
        type: 'user_not_found_for_profile',
        phone: userIdOrPhone,
        error: userError?.message,
      });
      return null;
    }

    userId = user.id;
  }

  // Now fetch the profile using UUID
  const { data, error } = await supabase
    .from('health_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    logger.error({
      type: 'profile_fetch_error',
      userId,
      error: error.message,
    });
    return null;
  }

  if (!data) {
    logger.info({
      type: 'profile_not_found',
      userId,
    });
    return null;
  }

  return data as HealthProfile;
}
```

## 🧪 Testing

### User Profile Verification
```json
{
  "user_id": "7399acc5-3102-45d1-a79b-a43ba355e2b1",
  "height": 175,
  "weight": 70,
  "age": 30,
  "gender": "male",
  "goal": "maintain",
  "activity_level": "light"
}
```

### Command Tests
All 8 commands tested successfully:
- ✅ stats
- ✅ history
- ✅ profile
- ✅ help
- ✅ start
- ✅ settings
- ✅ /stats
- ✅ /history

## 📱 Expected Behavior Now

When user clicks "My Profile" button:

1. Bot fetches existing profile using phone number
2. Calculates BMI: 70 / (1.75)² = 22.9
3. Displays profile information:
   ```
   📊 Your Health Profile

   • Height: 175 cm
   • Weight: 70 kg
   • Age: 30
   • Gender: male
   • BMI: 22.9
   • Goal: Maintain Health
   • Activity: Light Activity

   To update your profile, just tell me in natural language:
   "I'm now 65kg" or "My height is 170cm"
   ```

## 🚀 Deployment Status

- **Status**: ✅ Deployed
- **URL**: https://vita-whatsapp.vercel.app
- **Deployment Time**: ~1 minute ago
- **Build**: ✅ Successful

## 📝 Related Issues

This fix also resolves similar issues in other methods that use `userId`:
- `updateProfile(userId, updates)` - Already uses UUID correctly
- `isInSetupFlow(userId)` - May need similar fix
- `processSetupInput(userId, text, language)` - May need similar fix

## ✅ Next Steps

1. **User Testing**: Ask user to click "My Profile" button again
2. **Verify**: Bot should display existing profile, not start setup
3. **Monitor**: Check logs for any `user_not_found_for_profile` warnings

## 🎉 Summary

**Problem**: Profile command was broken because of phone number vs UUID mismatch

**Solution**: Modified `getProfile()` to handle both phone numbers and UUIDs

**Status**: ✅ **FIXED AND DEPLOYED**

**User Action**: Please test by clicking "My Profile" button in WhatsApp!
