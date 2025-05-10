export function formatMessageTime(date: Date) {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export const getKeyPair = async (): Promise<CryptoKeyPair> => {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256'
    },
    true,
    ['encrypt', 'decrypt']
  )
  return keyPair
}

export async function generateSymmetricKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

export const encryptMessage = async (text: string, receiverPublicKey: CryptoKey, senderPublicKey: CryptoKey): Promise<{ iv: string, text: string, receiverEncryptedKey: string, senderEncryptedKey: string }> => {
  const symmetricKey = await generateSymmetricKey();
  const encoder = new TextEncoder();
  const data = encoder.encode(text)
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    symmetricKey,
    data
  );
  const receiverEncryptedKey = await encryptSymmetricKey(symmetricKey, receiverPublicKey);
  const senderEncryptedKey = await encryptSymmetricKey(symmetricKey, senderPublicKey)
  return { iv: arrayBufferToBase64(iv), text: arrayBufferToBase64(encrypted), receiverEncryptedKey, senderEncryptedKey };
}

export const encryptSymmetricKey = async (symmetricKey: CryptoKey, publicKey: CryptoKey): Promise<string> => {
  const exportedKey = await crypto.subtle.exportKey('raw', symmetricKey);
  const encryptedKey = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    publicKey,
    exportedKey
  );
  return arrayBufferToBase64(encryptedKey);
};

export const decryptMessage = async ({ encryptedMessage, iv, encryptedKey }: { encryptedMessage: string, iv: string, encryptedKey: string }, privateKey: CryptoKey): Promise<string> => {
  if (!privateKey) {
    throw new Error('Private key is not a CryptoKey');
  }
  const symmetricKey = await decryptSymmetricKey(encryptedKey, privateKey);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToArrayBuffer(iv) },
    symmetricKey,
    base64ToArrayBuffer(encryptedMessage)
  );
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

export const decryptSymmetricKey = async (encryptedKey: string, privateKey: CryptoKey): Promise<CryptoKey> => {
  const decryptedKey = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    base64ToArrayBuffer(encryptedKey)
  );
  return await crypto.subtle.importKey(
    'raw',
    decryptedKey,
    { name: 'AES-GCM' },
    true,
    ['decrypt']
  );
};

export const importKey = async (jwk: JsonWebKey, method: "encrypt" | "decrypt"): Promise<CryptoKey> => {
  return await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    [method]
  );
};

export const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const binary = String.fromCharCode(...new Uint8Array(buffer));
  return btoa(binary);
};

export const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
};

export async function encryptWithPassword(jwk: JsonWebKey, password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt"]
  );
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(JSON.stringify(jwk)));
  return JSON.stringify({
    salt: arrayBufferToBase64(salt),
    iv: arrayBufferToBase64(iv),
    data: arrayBufferToBase64(encrypted),
  });
}

export async function decryptWithPassword(payload: string, password: string): Promise<JsonWebKey> {
  const { salt, iv, data } = JSON.parse(payload);
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: base64ToArrayBuffer(salt), iterations: 100_000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["decrypt"]
  );
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToArrayBuffer(iv) }, key, base64ToArrayBuffer(data));
  return JSON.parse(new TextDecoder().decode(decrypted));
}

