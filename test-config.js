// 简单的环境变量测试脚本
const fs = require('fs');
const path = require('path');

// 读取 .env 文件
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

// 解析环境变量
const env = {};
envContent.split('\n').forEach(line => {
  line = line.trim();
  if (line && !line.startsWith('#')) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      // 移除引号
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    }
  }
});

console.log('🔍 检查环境变量配置...\n');

const checks = [
  { name: 'OPENAI_API_KEY', value: env.OPENAI_API_KEY, required: true },
  { name: 'WHATSAPP_TOKEN', value: env.WHATSAPP_TOKEN, required: true },
  { name: 'WHATSAPP_PHONE_NUMBER_ID', value: env.WHATSAPP_PHONE_NUMBER_ID, required: true },
  { name: 'WHATSAPP_VERIFY_TOKEN', value: env.WHATSAPP_VERIFY_TOKEN, required: true },
  { name: 'WHATSAPP_APP_SECRET', value: env.WHATSAPP_APP_SECRET, required: true },
  { name: 'NEXT_PUBLIC_SUPABASE_URL', value: env.NEXT_PUBLIC_SUPABASE_URL, required: true },
  { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, required: true },
  { name: 'SUPABASE_SERVICE_KEY', value: env.SUPABASE_SERVICE_KEY, required: true },
  { name: 'UPSTASH_REDIS_URL', value: env.UPSTASH_REDIS_URL, required: true },
  { name: 'UPSTASH_REDIS_TOKEN', value: env.UPSTASH_REDIS_TOKEN, required: true },
  { name: 'STRIPE_SECRET_KEY', value: env.STRIPE_SECRET_KEY, required: false },
];

let passed = 0;
let failed = 0;

checks.forEach(check => {
  if (check.value) {
    console.log(`✅ ${check.name}: 已配置`);
    passed++;
  } else if (check.required) {
    console.log(`❌ ${check.name}: 未配置（必需）`);
    failed++;
  } else {
    console.log(`⏭️  ${check.name}: 未配置（可选）`);
  }
});

console.log('\n' + '='.repeat(50));
console.log(`✅ 通过: ${passed}`);
console.log(`❌ 失败: ${failed}`);
console.log(`📝 总计: ${checks.length}`);

if (failed > 0) {
  console.log('\n⚠️  有必需的配置项未设置！');
  process.exit(1);
} else {
  console.log('\n🎉 所有必需的环境变量都已配置！');
  console.log('\n📋 下一步：');
  console.log('1. 配置 WhatsApp Webhook（需要部署后的 URL）');
  console.log('2. 运行 npm run dev 启动开发服务器');
  console.log('3. 使用 ngrok 或部署到 Vercel 进行测试');
}
