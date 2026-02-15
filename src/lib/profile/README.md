# Profile Manager

The ProfileManager handles user health profile creation, validation, and updates through a conversational flow.

## Features

- **Conversational Profile Setup**: Guides users through profile creation step-by-step
- **Multi-language Support**: English, Simplified Chinese, Traditional Chinese
- **Data Validation**: Validates height (100-250cm), weight (30-300kg), age (10-120)
- **BMI Calculation**: Automatically calculates BMI from height and weight
- **Calorie Calculation**: Uses Mifflin-St Jeor formula for daily calorie targets
- **Natural Language Updates**: Parses simple natural language for profile updates
- **Error Handling**: Provides clear, localized error messages

## Usage

### Initialize Profile Setup

```typescript
import { profileManager } from '@/lib/profile';

// Start profile setup for a new user
await profileManager.initializeProfile(userId, 'en');
```

### Process User Input During Setup

```typescript
// Process each step of the setup
const isComplete = await profileManager.processSetupInput(
  userId,
  userInput,
  'en'
);

if (isComplete) {
  console.log('Profile setup complete!');
}
```

### Check Profile Status

```typescript
// Check if user has a profile
const hasProfile = await profileManager.hasProfile(userId);

// Get user profile
const profile = await profileManager.getProfile(userId);

// Check if user is in setup flow
const inSetup = profileManager.isInSetupFlow(userId);
```

### Update Profile

```typescript
// Direct update
await profileManager.updateProfile(userId, {
  weight: 65,
  height: 170,
});

// Natural language update
const wasUpdated = await profileManager.parseNaturalLanguageUpdate(
  userId,
  "I'm now 65kg",
  'en'
);
```

## Setup Flow

The profile setup follows this sequence:

1. **Height** (required): 100-250 cm
2. **Weight** (required): 30-300 kg
3. **Age** (optional): 10-120 years, can skip
4. **Gender** (optional): male/female, can skip
5. **Goal** (required): lose-weight, gain-muscle, control-sugar, maintain
6. **Activity Level** (required): sedentary, light, moderate, active

## Validation Rules

- **Height**: Must be between 100 and 250 cm
- **Weight**: Must be between 30 and 300 kg
- **Age**: Must be between 10 and 120 years (optional)
- **Gender**: Must be 'male' or 'female' (optional)
- **Goal**: Must be one of the four predefined goals
- **Activity Level**: Must be one of the four predefined levels

## Calculations

### BMI Calculation

```
BMI = weight (kg) / (height (m))²
```

### Daily Calorie Calculation (Mifflin-St Jeor)

**For Males:**
```
BMR = 10 × weight + 6.25 × height - 5 × age + 5
```

**For Females:**
```
BMR = 10 × weight + 6.25 × height - 5 × age - 161
```

**TDEE (Total Daily Energy Expenditure):**
```
TDEE = BMR × Activity Multiplier
```

Activity Multipliers:
- Sedentary: 1.2
- Light: 1.375
- Moderate: 1.55
- Active: 1.725

**Goal Adjustments:**
- Lose Weight: -500 kcal
- Gain Muscle: +300 kcal
- Control Sugar: 0 kcal
- Maintain: 0 kcal

## Natural Language Parsing

The ProfileManager can parse simple natural language updates:

**Weight Updates:**
- "I'm now 65kg"
- "My weight is 65 kg"
- "65kg"
- "我现在 65kg"

**Height Updates:**
- "My height is 170cm"
- "I am 170 cm tall"
- "170cm"
- "我身高 170cm"

## Integration with Text Handler

The ProfileManager is integrated with the WhatsApp text handler:

```typescript
// In text-handler.ts
if (profileManager.isInSetupFlow(context.userId)) {
  await profileManager.processSetupInput(
    context.userId,
    text,
    context.language
  );
  return;
}

// Try natural language update
const wasProfileUpdate = await profileManager.parseNaturalLanguageUpdate(
  context.userId,
  text,
  context.language
);
```

## Error Handling

All errors are logged and user-friendly error messages are sent:

```typescript
try {
  await profileManager.processSetupInput(userId, input, language);
} catch (error) {
  // Error is logged and user receives localized error message
}
```

## Requirements Fulfilled

- **4.1**: Conversational profile initialization
- **4.2**: Data validation (height, weight, age)
- **4.3**: BMI calculation
- **4.8**: Daily calorie calculation using Mifflin-St Jeor formula
- **15.1**: Multi-language support (en, zh-CN, zh-TW)

## Future Enhancements

- AI-powered natural language understanding for more complex updates
- Profile history tracking
- Goal progress tracking
- Personalized recommendations based on profile
