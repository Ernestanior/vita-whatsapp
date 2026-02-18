/**
 * Check if user has a health profile
 */

const response = await fetch('https://vita-whatsapp.vercel.app/api/check-user-data?phone=6583153431');
const data = await response.json();

console.log('User Data:');
console.log(JSON.stringify(data, null, 2));

if (data.profile) {
  console.log('\n✅ User HAS a health profile:');
  console.log(JSON.stringify(data.profile, null, 2));
} else {
  console.log('\n❌ User does NOT have a health profile');
}
