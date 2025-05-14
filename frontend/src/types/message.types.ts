export type Message = {
  _id: string;
  senderId: string;
  receiverId: string;
  text: string;
  image: string;
  iv: string;
  receiverEncryptedKey: string;
  senderEncryptedKey: string;
  createdAt: string;
  updatedAt: string;
}
