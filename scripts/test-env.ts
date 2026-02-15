#!/usr/bin/env tsx
/**
 * 环境变量配置测试脚本
 * 验证所有必需的环境变量是否正确配置
 */

import { createClient } from '@supabase/supabase-js';
import { Redis } from '@upstash/redis';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  message: string;
}

const results: TestResult[] = [];

function addResult(name: string, status: 'pass' | 'fail' | 'skip', message: string) {
  results.push({ name, status, message });
  const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⏭️';
  console.log(`${icon} ${name}: ${message}`);
}

async function testEnvironmentVariables() {
  console.log('🔍 测试环境变量配置...\n');

  // 1. 测试 OpenAI API Key
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey && openaiKey.startsWith('sk-')) {
    addResult('OpenAI API Key', 'pass', '已配置');
  } else {
    addResult('OpenAI API Key', 'fail', '未配置或格式错误');
  }

  // 2. 测试 WhatsApp 配置
  const whatsappToken = process.env.WHATSAPP_TOKEN;
  const whatsappPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const whatsappVerifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  const whatsappAppSecret = process.env.WHATSAPP_APP_SECRET;

  if (whatsappToken && whatsappToken.startsWith('EAA')) {
    addResult('WhatsApp Token', 'pass', '已配置');
  } else {
    addResult('WhatsApp Token', 'fail', '未配置或格式错误');
  }

  if (whatsappPhoneId) {
    addResult('WhatsApp Phone Number ID', 'pass', '已配置');
  } else {
    addResult('WhatsApp Phone Number ID', 'fail', '未配置');
  }

  if (whatsappVerifyToken) {
    addResult('WhatsApp Verify Token', 'pass', '已配置');
  } else {
    addResult('WhatsApp Verify Token', 'fail', '未配置');
  }

  if (whatsappAppSecret) {
    addResult('WhatsApp App Secret', 'pass', '已配置');
  } else {
    addResult('WhatsApp App Secret', 'fail', '未配置');
  }

  // 3. 测试 Supabase 连接
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (supabaseUrl && supabaseAnonKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { error } = await supabase.from('users').select('count').limit(1);
      
      if (error) {
        addResult('Supabase 连接', 'fail', `连接失败: ${error.message}`);
      } else {
        addResult('Supabase 连接', 'pass', '连接成功');
      }
    } catch (error) {
      addResult('Supabase 连接', 'fail', `连接失败: ${error}`);
    }
  } else {
    addResult('Supabase 连接', 'fail', 'URL 或 Key 未配置');
  }

  if (supabaseServiceKey) {
    addResult('Supabase Service Key', 'pass', '已配置');
  } else {
    addResult('Supabase Service Key', 'fail', '未配置');
  }

  // 4. 测试 Upstash Redis 连接
  const redisUrl = process.env.UPSTASH_REDIS_URL;
  const redisToken = process.env.UPSTASH_REDIS_TOKEN;

  if (redisUrl && redisToken) {
    try {
      const redis = new Redis({
        url: redisUrl,
        token: redisToken,
      });
      
      await redis.set('test_key', 'test_value', { ex: 10 });
      const value = await redis.get('test_key');
      
      if (value === 'test_value') {
        addResult('Upstash Redis 连接', 'pass', '连接成功');
      } else {
        addResult('Upstash Redis 连接', 'fail', '读写测试失败');
      }
    } catch (error) {
      addResult('Upstash Redis 连接', 'fail', `连接失败: ${error}`);
    }
  } else {
    addResult('Upstash Redis 连接', 'fail', 'URL 或 Token 未配置');
  }

  // 5. 测试可选配置
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (stripeKey) {
    addResult('Stripe Secret Key', 'pass', '已配置（可选）');
  } else {
    addResult('Stripe Secret Key', 'skip', '未配置（可选）');
  }

  // 汇总结果
  console.log('\n' + '='.repeat(50));
  console.log('📊 测试结果汇总\n');
  
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const skipped = results.filter(r => r.status === 'skip').length;
  
  console.log(`✅ 通过: ${passed}`);
  console.log(`❌ 失败: ${failed}`);
  console.log(`⏭️  跳过: ${skipped}`);
  console.log(`📝 总计: ${results.length}`);
  
  if (failed > 0) {
    console.log('\n⚠️  有配置项失败，请检查 .env 文件');
    process.exit(1);
  } else {
    console.log('\n🎉 所有必需配置项测试通过！');
    process.exit(0);
  }
}

// 运行测试
testEnvironmentVariables().catch((error) => {
  console.error('❌ 测试过程中发生错误:', error);
  process.exit(1);
});
