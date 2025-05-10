import { decryptWithPassword, encryptWithPassword } from "./util";

export async function exportAndEncryptPrivateKey(privateKey: CryptoKey, password: string) {
  const jwk = await crypto.subtle.exportKey("jwk", privateKey);
  return await encryptWithPassword(jwk, password);
}

export async function importEncryptedPrivateKey(encryptedPayload: string, password: string) {
  const jwk = await decryptWithPassword(encryptedPayload, password);
  return await crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["decrypt"]
  );
}
