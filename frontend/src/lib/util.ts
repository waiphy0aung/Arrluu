export function formatMessageTime(date: Date) {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export const testE2EE = async () => {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  );
  const { publicKey, privateKey } = keyPair

  //encryption
  const encoder = new TextEncoder()
  const data = encoder.encode("Hello")
  const encrypted = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    publicKey,
    data
  )

  const base64 = arrayBufferToBase64(encrypted)
  console.log("encrypt", base64)

  //decryption
  const buffer = base64ToArrayBuffer(base64);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    buffer
  );
  const decoder = new TextDecoder();
  console.log("decrypt", decoder.decode(decrypted))
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

export const encryptMessage = async (text: string, publicKey: CryptoKey): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(text)
  const encrypted = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    data
  )
  const base64 = arrayBufferToBase64(encrypted)
  return base64
}

export const decryptMessage = async (base64: string, privateKey: CryptoKey): Promise<string> => {
  const buffer = base64ToArrayBuffer(base64)
  const decrypted = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    buffer
  )
  const decoder = new TextDecoder();
  return decoder.decode(decrypted)
}

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
