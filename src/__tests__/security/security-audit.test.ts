/**
 * 安全审计测试
 * 检查 RLS 策略、API 安全、数据加密、日志脱敏
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import { encrypt, decrypt } from '@/lib/security/encryption';
import { verifyWhatsAppSignature, verifyStripeSignature } from '@/lib/security/webhook-verifier';
import { checkRateLimit } from '@/lib/security/rate-limiter';
import { logger } from '@/lib/logging';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

describe('Security Audit: RLS Policies', () => {
  let serviceClient: ReturnType<typeof createClient>;
  let anonClient: ReturnType<typeof createClient>;
  let testUserId1: string;
  let testUserId2: string;

  beforeAll(async () => {
    serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    anonClient = createClient(supabaseUrl, supabaseAnonKey);

    // 创建测试用户
    const { data: user1 } = await serviceClient.from('users').insert({
      phone_number: '+6591234567',
      language: 'en',
    }).select().single();

    const { data: user2 } = await serviceClient.from('users').insert({
      phone_number: '+6591234568',
      language: 'en',
    }).select().single();

    testUserId1 = user1!.id;
    testUserId2 = user2!.id;

    // 创建测试数据
    await serviceClient.from('health_profiles').insert({
      user_id: testUserId1,
      age: 30,
      gender: 'male',
      height_cm: 175,
      weight_kg: 70,
      activity_level: 'moderate',
      health_goal: 'maintain',
    });

    await serviceClient.from('food_records').insert({
      user_id: testUserId1,
      food_name: 'Chicken Rice',
      calories: 500,
      rating: 'green',
    });
  });

  afterAll(async () => {
    // 清理测试数据
    await serviceClient.from('food_records').delete().eq('user_id', testUserId1);
    await serviceClient.from('health_profiles').delete().eq('user_id', testUserId1);
    await serviceClient.from('users').delete().eq('id', testUserId1);
    await serviceClient.from('users').delete().eq('id', testUserId2);
  });

  it('should prevent users from accessing other users health profiles', async () => {
    // 使用 user2 的身份尝试访问 user1 的健康画像
    const { data, error } = await anonClient
      .from('health_profiles')
      .select('*')
      .eq('user_id', testUserId1);

    // 应该返回空数组或错误（因为没有认证）
    expect(data).toEqual([]);
  });

  it('should prevent users from accessing other users food records', async () => {
    // 使用匿名客户端尝试访问 user1 的食物记录
    const { data, error } = await anonClient
      .from('food_records')
      .select('*')
      .eq('user_id', testUserId1);

    // 应该返回空数组或错误
    expect(data).toEqual([]);
  });

  it('should allow users to access their own data', async () => {
    // 使用 service role 模拟认证用户访问自己的数据
    const { data, error } = await serviceClient
      .from('health_profiles')
      .select('*')
      .eq('user_id', testUserId1);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].user_id).toBe(testUserId1);
  });

  it('should prevent users from modifying other users data', async () => {
    // 尝试修改其他用户的数据
    const { error } = await anonClient
      .from('health_profiles')
      .update({ age: 99 })
      .eq('user_id', testUserId1);

    // 应该失败
    expect(error).not.toBeNull();
  });
});

describe('Security Audit: API Security', () => {
  it('should enforce rate limiting', async () => {
    const identifier = 'test-user-rate-limit';

    // 第一次请求应该成功
    const result1 = await checkRateLimit(identifier);
    expect(result1.success).toBe(true);

    // 连续请求多次
    const requests = [];
    for (let i = 0; i < 15; i++) {
      requests.push(checkRateLimit(identifier));
    }

    const results = await Promise.all(requests);

    // 应该有一些请求被限制
    const blocked = results.filter((r) => !r.success);
    expect(blocked.length).toBeGreaterThan(0);
  });

  it('should verify WhatsApp webhook signatures', () => {
    const payload = JSON.stringify({ test: 'data' });
    const secret = 'test-secret';

    // 生成有效签名
    const crypto = require('crypto');
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // 验证有效签名
    const validResult = verifyWhatsAppSignature(payload, signature, secret);
    expect(validResult).toBe(true);

    // 验证无效签名
    const invalidResult = verifyWhatsAppSignature(payload, 'invalid-signature', secret);
    expect(invalidResult).toBe(false);
  });

  it('should verify Stripe webhook signatures', () => {
    const payload = JSON.stringify({ test: 'data' });
    const secret = 'whsec_test123';
    const timestamp = Math.floor(Date.now() / 1000);

    // 生成有效签名
    const crypto = require('crypto');
    const signedPayload = `${timestamp}.${payload}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    const header = `t=${timestamp},v1=${signature}`;

    // 验证有效签名
    const validResult = verifyStripeSignature(payload, header, secret);
    expect(validResult).toBe(true);

    // 验证无效签名
    const invalidHeader = `t=${timestamp},v1=invalid`;
    const invalidResult = verifyStripeSignature(payload, invalidHeader, secret);
    expect(invalidResult).toBe(false);
  });
});

describe('Security Audit: Data Encryption', () => {
  it('should encrypt and decrypt sensitive data', () => {
    const sensitiveData = 'user-secret-token-12345';

    // 加密
    const encrypted = encrypt(sensitiveData);
    expect(encrypted).not.toBe(sensitiveData);
    expect(encrypted.length).toBeGreaterThan(0);

    // 解密
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(sensitiveData);
  });

  it('should produce different ciphertext for same plaintext', () => {
    const data = 'same-data';

    const encrypted1 = encrypt(data);
    const encrypted2 = encrypt(data);

    // 由于使用随机 IV，每次加密结果应该不同
    expect(encrypted1).not.toBe(encrypted2);

    // 但解密后应该相同
    expect(decrypt(encrypted1)).toBe(data);
    expect(decrypt(encrypted2)).toBe(data);
  });

  it('should fail to decrypt tampered data', () => {
    const data = 'important-data';
    const encrypted = encrypt(data);

    // 篡改加密数据
    const tampered = encrypted.slice(0, -5) + 'xxxxx';

    // 解密应该失败
    expect(() => decrypt(tampered)).toThrow();
  });
});

describe('Security Audit: Log Sanitization', () => {
  it('should mask phone numbers in logs', () => {
    const logOutput: string[] = [];
    const originalLog = console.log;

    // 捕获日志输出
    console.log = (...args: any[]) => {
      logOutput.push(args.join(' '));
    };

    // 记录包含手机号的日志
    logger.info('User login', {
      phone: '+6591234567',
      action: 'login',
    });

    console.log = originalLog;

    // 检查日志是否脱敏
    const logString = logOutput.join(' ');
    expect(logString).not.toContain('+6591234567');
    expect(logString).toContain('***4567'); // 应该只显示后4位
  });

  it('should mask email addresses in logs', () => {
    const logOutput: string[] = [];
    const originalLog = console.log;

    console.log = (...args: any[]) => {
      logOutput.push(args.join(' '));
    };

    logger.info('User registration', {
      email: 'user@example.com',
      action: 'register',
    });

    console.log = originalLog;

    const logString = logOutput.join(' ');
    expect(logString).not.toContain('user@example.com');
    expect(logString).toContain('u***@example.com'); // 应该脱敏
  });

  it('should mask passwords and tokens in logs', () => {
    const logOutput: string[] = [];
    const originalLog = console.log;

    console.log = (...args: any[]) => {
      logOutput.push(args.join(' '));
    };

    logger.info('Authentication', {
      password: 'secret123',
      token: 'Bearer abc123xyz',
      apiKey: 'sk-1234567890',
    });

    console.log = originalLog;

    const logString = logOutput.join(' ');
    expect(logString).not.toContain('secret123');
    expect(logString).not.toContain('abc123xyz');
    expect(logString).not.toContain('sk-1234567890');
    expect(logString).toContain('***'); // 应该被替换为 ***
  });

  it('should not mask non-sensitive data', () => {
    const logOutput: string[] = [];
    const originalLog = console.log;

    console.log = (...args: any[]) => {
      logOutput.push(args.join(' '));
    };

    logger.info('Food recognition', {
      foodName: 'Chicken Rice',
      calories: 500,
      rating: 'green',
    });

    console.log = originalLog;

    const logString = logOutput.join(' ');
    expect(logString).toContain('Chicken Rice');
    expect(logString).toContain('500');
    expect(logString).toContain('green');
  });
});
