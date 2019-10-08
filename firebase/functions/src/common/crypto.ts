import { createHash, createHmac } from 'crypto';

export const sha1Hmac = (text: string, key: string) => createHmac('sha1', key).update(text).digest('hex');

export const md5Hash = (text: string) => createHash('md5').update(text).digest('hex');
