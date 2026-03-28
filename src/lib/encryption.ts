import crypto from 'crypto';

// 加密密钥 - 在生产环境中应该从环境变量获取
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-secret-key-change-in-production';
const IV_LENGTH = 16; // 初始化向量长度

/**
 * 确保密钥长度为32字节（256位）
 * @param key 原始密钥
 * @returns 处理后的密钥
 */
function getValidKey(key: string): Buffer {
  // 使用SHA-256哈希确保密钥长度为32字节
  return crypto.createHash('sha256').update(key).digest();
}

/**
 * 加密数据
 * @param text 要加密的文本
 * @returns 加密后的文本
 */
export function encrypt(text: string): string {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getValidKey(ENCRYPTION_KEY);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (error) {
    console.error('Encryption error:', error);
    // 如果加密失败，返回原始文本
    return text;
  }
}

/**
 * 解密数据
 * @param text 要解密的文本
 * @returns 解密后的文本
 */
export function decrypt(text: string): string {
  try {
    const textParts = text.split(':');
    if (textParts.length < 2) {
      // 如果格式不正确，返回原始文本
      return text;
    }
    const ivHex = textParts.shift()!;
    if (!ivHex || ivHex.length !== IV_LENGTH * 2) {
      // 如果IV长度不正确，返回原始文本
      return text;
    }
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const key = getValidKey(ENCRYPTION_KEY);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    // 如果解密失败，返回原始文本
    console.error('Decryption error:', error);
    return text;
  }
}
