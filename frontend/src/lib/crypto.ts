import { MessageFormState } from "../components/MessageInput";
import { useAuthStore } from "../store/useAuthStore";
import { ChatState } from "../store/useChatStore";
import { Message } from "../types/message.types";
import { User } from "../types/user.types";
import { arrayBufferToBase64, base64ToArrayBuffer } from "./encoding";

const AES_GCM = 'AES-GCM';
const RSA_OAEP = 'RSA-OAEP';
const HASH = 'SHA-256';
const AES_LENGTH = 256;
const RSA_MODULUS_LENGTH = 2048;
const RSA_PUBLIC_EXPONENT = new Uint8Array([1, 0, 1]);
const PBKDF2_ITERATIONS = 100_000;

const publicKeyCache = new Map<string, CryptoKey>();

export async function getKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    {
      name: RSA_OAEP,
      modulusLength: RSA_MODULUS_LENGTH,
      publicExponent: RSA_PUBLIC_EXPONENT,
      hash: HASH,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function generateSymmetricKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: AES_GCM, length: AES_LENGTH },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function exportAndEncryptPrivateKey(privateKey: CryptoKey, password: string): Promise<string> {
  const jwk = await crypto.subtle.exportKey("jwk", privateKey);
  return encryptWithPassword(jwk, password);
}

export async function importEncryptedPrivateKey(encryptedPayload: string, password: string): Promise<CryptoKey> {
  const jwk = await decryptWithPassword(encryptedPayload, password);
  return await getCachedPublicKey(jwk, "decrypt")
}

export async function getCachedPublicKey(
  jwk: JsonWebKey,
  usage: "encrypt" | "decrypt"
): Promise<CryptoKey> {
  const keyId = JSON.stringify(jwk);
  if (publicKeyCache.has(keyId)) {
    return publicKeyCache.get(keyId)!;
  }
  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: RSA_OAEP, hash: HASH },
    true,
    [usage]
  )
  publicKeyCache.set(keyId, key);
  return key
}

export async function encryptSymmetricKey(symmetricKey: CryptoKey, publicKey: CryptoKey): Promise<string> {
  const exportedKey = await crypto.subtle.exportKey("raw", symmetricKey);
  const encrypted = await crypto.subtle.encrypt({ name: RSA_OAEP }, publicKey, exportedKey);
  return arrayBufferToBase64(encrypted);
}

export async function decryptSymmetricKey(encryptedKey: string, privateKey: CryptoKey): Promise<CryptoKey> {
  const decrypted = await crypto.subtle.decrypt(
    { name: RSA_OAEP },
    privateKey,
    base64ToArrayBuffer(encryptedKey)
  );
  return crypto.subtle.importKey("raw", decrypted, { name: AES_GCM }, true, ["decrypt"]);
}

export async function encryptMessage(messageData: MessageFormState, selectedUser: User, authUser: User): Promise<{
  iv: string;
  text: string;
  receiverEncryptedKey: string;
  senderEncryptedKey: string;
}> {
  const receiverPublicKey = await getCachedPublicKey(selectedUser.publicKey, "encrypt");
  const senderPublicKey = await getCachedPublicKey(authUser.publicKey, "encrypt");
  const symmetricKey = await generateSymmetricKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: AES_GCM, iv },
    symmetricKey,
    new TextEncoder().encode(messageData.text)
  );

  const receiverEncryptedKey = await encryptSymmetricKey(symmetricKey, receiverPublicKey);
  const senderEncryptedKey = await encryptSymmetricKey(symmetricKey, senderPublicKey);

  return {
    iv: arrayBufferToBase64(iv),
    text: arrayBufferToBase64(encrypted),
    receiverEncryptedKey,
    senderEncryptedKey,
  };
}

export async function decryptMessage(msg: Message, privateKey: ChatState["privateKey"]): Promise<Message> {
  let decryptedText = msg.text;
  if (decryptedText) {
    const encryptedKey = msg.senderId === useAuthStore.getState().authUser?._id ? msg.senderEncryptedKey : msg.receiverEncryptedKey;
    const { text, iv } = msg
    if (!(privateKey instanceof CryptoKey)) throw new Error("Invalid private key");

    const symmetricKey = await decryptSymmetricKey(encryptedKey, privateKey);
    const decrypted = await crypto.subtle.decrypt(
      { name: AES_GCM, iv: base64ToArrayBuffer(iv) },
      symmetricKey,
      base64ToArrayBuffer(text)
    );

    decryptedText = new TextDecoder().decode(decrypted);
  }
  return { ...msg, text: decryptedText };

}

export async function decryptMessageOld(
  { encryptedMessage, iv, encryptedKey }: { encryptedMessage: string; iv: string; encryptedKey: string },
  privateKey: CryptoKey
): Promise<string> {
  if (!(privateKey instanceof CryptoKey)) throw new Error("Invalid private key");

  const symmetricKey = await decryptSymmetricKey(encryptedKey, privateKey);
  const decrypted = await crypto.subtle.decrypt(
    { name: AES_GCM, iv: base64ToArrayBuffer(iv) },
    symmetricKey,
    base64ToArrayBuffer(encryptedMessage)
  );

  return new TextDecoder().decode(decrypted);
}

export async function encryptWithPassword(jwk: JsonWebKey, password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: HASH },
    keyMaterial,
    { name: AES_GCM, length: AES_LENGTH },
    true,
    ["encrypt"]
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: AES_GCM, iv },
    key,
    encoder.encode(JSON.stringify(jwk))
  );

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
    {
      name: "PBKDF2",
      salt: base64ToArrayBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: HASH,
    },
    keyMaterial,
    { name: AES_GCM, length: AES_LENGTH },
    true,
    ["decrypt"]
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: AES_GCM, iv: base64ToArrayBuffer(iv) },
    key,
    base64ToArrayBuffer(data)
  );

  return JSON.parse(new TextDecoder().decode(decrypted));
}
