export interface EncryptedMessage {
  iv: string;
  text: string;
  receiverEncryptedKey: string;
  senderEncryptedKey: string;
}

export interface KeyPairResult {
  publicKeyJwk: JsonWebKey;
  encryptedPrivateKey: string;
}

export interface CryptoKeyPairEx extends CryptoKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}
