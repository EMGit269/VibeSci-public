import crypto from 'crypto';

// 加密密钥 - 在生产环境中应该从环境变量获取
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-secret-key-change-in-production';
const IV_LENGTH = 16; // 初始化向量长度

/**
 * 加密数据
 * @param text 要加密的文本
 * @returns 加密后的文本
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
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
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    // 如果解密失败，返回原始文本
    console.error('Decryption error:', error);
    return text;
  }
}
