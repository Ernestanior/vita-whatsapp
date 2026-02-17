import 'dotenv/config';
import { redis } from '../src/lib/redis/client';

async function testRedis() {
  console.log('Testing Redis connection...');
  console.log('Redis URL:', process.env.UPSTASH_REDIS_URL);
  
  try {
    // Test 1: Simple set/get
    console.log('\n1. Testing SET/GET...');
    await redis.set('test:key', 'test-value', { ex: 60 });
    const value = await redis.get('test:key');
    console.log('✓ SET/GET works:', value);
    
    // Test 2: Delete
    console.log('\n2. Testing DELETE...');
    await redis.del('test:key');
    const deleted = await redis.get('test:key');
    console.log('✓ DELETE works:', deleted === null);
    
    // Test 3: SETEX
    console.log('\n3. Testing SETEX...');
    await redis.setex('test:key2', 60, 'test-value-2');
    const value2 = await redis.get('test:key2');
    console.log('✓ SETEX works:', value2);
    
    // Cleanup
    await redis.del('test:key2');
    
    console.log('\n✅ All Redis tests passed!');
  } catch (error) {
    console.error('\n❌ Redis test failed:', error);
    process.exit(1);
  }
}

testRedis();
