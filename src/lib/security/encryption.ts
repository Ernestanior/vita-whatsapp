/**
 * 数据加密工具类
 * 使用 AES-256-GCM 加密敏感数据
 */

import crypto from 'crypto';
import { env } from '@/config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 初始化向量长度
const AUTH_TAG_LENGTH = 16; // 认证标签长度
const SALT_LENGTH = 32; // 盐值长度

/**
 * 从环境变量获取加密密钥
 * 如果未设置，生成一个临时密钥（仅用于开发环境）
 */
function getEncryptionKey(): Buffer {
  if (env.ENCRYPTION_KEY) {
    return Buffer.from(env.ENCRYPTION_KEY, 'hex');
  }

  // 开发环境：生成临时密钥
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️  ENCRYPTION_KEY not set, using temporary key for development');
    return crypto.randomBytes(32);
  }

  throw new Error('ENCRYPTION_KEY environment variable is required in production');
}

/**
 * 加密文本
 * @param text 要加密的文本
 * @returns 加密后的字符串（格式：iv:authTag:encrypted）
 */
export function encrypt(text: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // 返回格式：iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * 解密文本
 * @param encryptedText 加密的文本（格式：iv:authTag:encrypted）
 * @returns 解密后的原始文本
 */
export function decrypt(encryptedText: string): string {
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format');
    }

    const [ivHex, authTagHex, encrypted] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * 加密对象（转换为 JSON 后加密）
 * @param obj 要加密的对象
 * @returns 加密后的字符串
 */
export function encryptObject<T>(obj: T): string {
  const json = JSON.stringify(obj);
  return encrypt(json);
}

/**
 * 解密对象（解密后解析 JSON）
 * @param encryptedText 加密的文本
 * @returns 解密后的对象
 */
export function decryptObject<T>(encryptedText: string): T {
  const json = decrypt(encryptedText);
  return JSON.parse(json) as T;
}

/**
 * 生成安全的随机 token
 * @param length token 长度（字节数）
 * @returns 十六进制格式的 token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * 哈希密码（使用 PBKDF2）
 * @param password 原始密码
 * @param salt 盐值（可选，如果不提供则自动生成）
 * @returns 格式：salt:hash
 */
export function hashPassword(password: string, salt?: string): string {
  const saltBuffer = salt ? Buffer.from(salt, 'hex') : crypto.randomBytes(SALT_LENGTH);
  const hash = crypto.pbkdf2Sync(password, saltBuffer, 100000, 64, 'sha512');

  return `${saltBuffer.toString('hex')}:${hash.toString('hex')}`;
}

/**
 * 验证密码
 * @param password 要验证的密码
 * @param hashedPassword 存储的哈希密码（格式：salt:hash）
 * @returns 是否匹配
 */
export function verifyPassword(password: string, hashedPassword: string): boolean {
  try {
    const [salt, originalHash] = hashedPassword.split(':');
    const newHash = hashPassword(password, salt);
    const [, newHashValue] = newHash.split(':');

    // 使用时间安全的比较
    return crypto.timingSafeEqual(
      Buffer.from(originalHash, 'hex'),
      Buffer.from(newHashValue, 'hex')
    );
  } catch (error) {
    console.error('Password verification failed:', error);
    return false;
  }
}

/**
 * 生成 SHA256 哈希
 * @param data 要哈希的数据
 * @returns 十六进制格式的哈希值
 */
export function sha256(data: string | Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * 生成 HMAC 签名
 * @param data 要签名的数据
 * @param secret 密钥
 * @returns 十六进制格式的签名
 */
export function hmacSign(data: string | Buffer, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * 验证 HMAC 签名
 * @param data 原始数据
 * @param signature 签名
 * @param secret 密钥
 * @returns 是否匹配
 */
export function hmacVerify(data: string | Buffer, signature: string, secret: string): boolean {
  try {
    const expectedSignature = hmacSign(data, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error('HMAC verification failed:', error);
    return false;
  }
}
