/**
 * Singapore English Messages
 * 
 * Uses local Singlish expressions and food references
 */

export const singaporeMessages = {
  welcome: `Eh welcome to Vita AI lah! 👋

I'm your personal nutrition kaki (buddy).

🚀 *Super Easy to Start:*

Just snap and send me your food photo can already!
📸 I'll analyze straightaway.

No need setup first. I'll learn about you as we go along.

*Want Faster Results?*
Tell me: \`25 170 65\` (age height weight)

Ready? Send your first food photo! 📸`,

  quickSetupSuccess: (age: number, height: number, weight: number, bmi: string, goal: string) => `Shiok! Profile created already! ✅

📊 Your Info:
• Age: ${age} years old
• Height: ${height} cm
• Weight: ${weight} kg
• BMI: ${bmi}
• Goal: ${goal}

🎉 All set liao! Send me food photo to start tracking.`,

  helpMessage: `🤖 Vita AI Help

*How to Use:*
📸 Send food photo for instant analysis
💬 Tell me about yourself to setup profile
🎯 Get personalized health tips

*Quick Actions:*
Use buttons below to get started lah!`,

  profileView: (height: number, weight: number, age: number, bmi: string, goal: string) => `📊 Your Health Profile

• Height: ${height} cm
• Weight: ${weight} kg
• Age: ${age} years old
• BMI: ${bmi}
• Goal: ${goal}

To update, just tell me:
"I'm now 65kg" or "My height is 170cm"`,

  quotaExceeded: (limit: number) => `Wah, you've used up your ${limit} free scans for today already! 📊

Upgrade to Premium for:
✨ Unlimited food recognition
📈 Daily health summaries
📊 Advanced analytics

Type "upgrade" to learn more, or come back tomorrow for ${limit} more free scans lah!`,

  foodAnalysisStart: `📸 Got your photo! Analyzing your food now...`,

  foodAnalysisTimeout: `⏳ Taking longer than usual leh, please wait ah...`,

  invalidInput: `Paiseh (sorry), I don't understand leh 🤔

Try these:
• Send 3 numbers for quick setup: \`25 170 65\`
• Send food photo for analysis 📸
• Click button below for help`,

  errorGeneric: `Aiyo! Something went wrong while analyzing your food lah.

Please try again, or send different photo.

If problem continues, type "help" for support.`,

  // Food-specific messages
  foodMessages: {
    chickenRice: `Wah, chicken rice! Singapore's favorite! 🍗🍚`,
    nasiLemak: `Nasi lemak! Shiok! 🍛`,
    laksa: `Laksa! Sedap (delicious)! 🍜`,
    charKwayTeow: `Char kway teow! Power! 🍝`,
    hokkienMee: `Hokkien mee! Steady lah! 🍜`,
    bakkutTeh: `Bak kut teh! Good for health! 🍲`,
    rojak: `Rojak! Nice mix! 🥗`,
    satay: `Satay! Shiok with peanut sauce! 串烧`,
    carrotCake: `Chai tow kway (carrot cake)! Classic! 🥘`,
    economicRice: `Economic rice! Value for money! 🍱`,
  },

  // Health ratings with local flavor
  healthRatings: {
    green: `🟢 Healthy choice! Steady lah!`,
    yellow: `🟡 Not bad, but can improve!`,
    red: `🔴 Wah, quite unhealthy leh! Better watch out!`,
  },

  // Suggestions with local context
  suggestions: {
    reduceRice: `Can reduce rice portion a bit lah`,
    addVegetables: `Add more vegetables can or not?`,
    lessSauce: `Go easy on the sauce leh`,
    drinkWater: `Drink more water to flush out the salt`,
    avoidFried: `Try to avoid fried food, go for steamed instead`,
    smallerPortion: `Portion quite big leh, can share or tapao (takeaway) half`,
  },

  // Progressive profiling
  progressivePrompts: {
    after2Photos: `🎉 Wah, you've logged 2 meals already!

Want personalized advice or not?

Just send me 3 numbers:
\`age height weight\`

Example: \`25 170 65\`

Or continue sending photos - I'll keep analyzing! 📸`,

    after5Photos: `💪 Doing great! 5 meals tracked already!

Want better recommendations?

Tell me your health goal:
1️⃣ Lose weight
2️⃣ Gain muscle
3️⃣ Control blood sugar
4️⃣ Maintain health

Just reply with number (1-4) can already`,
  },

  // Common Singaporean food items
  localFoods: {
    'chicken rice': 'Hainanese Chicken Rice',
    'nasi lemak': 'Nasi Lemak',
    'laksa': 'Laksa',
    'char kway teow': 'Char Kway Teow',
    'hokkien mee': 'Hokkien Mee',
    'bak kut teh': 'Bak Kut Teh',
    'rojak': 'Rojak',
    'satay': 'Satay',
    'carrot cake': 'Chai Tow Kway',
    'economic rice': 'Economic Rice / Cai Png',
    'roti prata': 'Roti Prata',
    'mee goreng': 'Mee Goreng',
    'nasi goreng': 'Nasi Goreng',
    'kaya toast': 'Kaya Toast',
    'bak chor mee': 'Minced Meat Noodles',
    'fish head curry': 'Fish Head Curry',
    'chilli crab': 'Chilli Crab',
    'black pepper crab': 'Black Pepper Crab',
    'oyster omelette': 'Orh Luak',
    'popiah': 'Popiah',
  },
};

/**
 * Get Singapore-style message
 */
export function getSingaporeMessage(key: string, ...args: any[]): string {
  // Navigate nested object
  const keys = key.split('.');
  let message: any = singaporeMessages;
  
  for (const k of keys) {
    message = message[k];
    if (!message) return key; // Return key if not found
  }
  
  // If it's a function, call it with args
  if (typeof message === 'function') {
    return message(...args);
  }
  
  return message;
}

/**
 * Detect if food is a local Singaporean dish
 */
export function isLocalFood(foodName: string): boolean {
  const normalized = foodName.toLowerCase();
  return Object.keys(singaporeMessages.localFoods).some(food => 
    normalized.includes(food)
  );
}

/**
 * Get local food name
 */
export function getLocalFoodName(foodName: string): string {
  const normalized = foodName.toLowerCase();
  for (const [key, value] of Object.entries(singaporeMessages.localFoods)) {
    if (normalized.includes(key)) {
      return value;
    }
  }
  return foodName;
}

/**
 * Add Singapore flavor to message
 */
export function addSingaporeFlavor(message: string, foodName?: string): string {
  let enhanced = message;
  
  // Add local food recognition
  if (foodName && isLocalFood(foodName)) {
    const localName = getLocalFoodName(foodName);
    enhanced = `Wah, ${localName}! 😋\n\n` + enhanced;
  }
  
  // Add encouraging words
  const encouragements = [
    'Steady lah!',
    'Keep it up!',
    'Good choice!',
    'Not bad!',
    'Shiok!',
  ];
  
  // Randomly add encouragement (30% chance)
  if (Math.random() < 0.3) {
    enhanced += `\n\n${encouragements[Math.floor(Math.random() * encouragements.length)]}`;
  }
  
  return enhanced;
}
