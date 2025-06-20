import { z } from "zod";

// RSA Public Key JWK validation
const RSAPublicKeyJWKSchema = z.object({
  kty: z.literal("RSA"),
  use: z.literal("enc").optional(),
  key_ops: z.array(z.enum(["encrypt"])).optional(),
  alg: z.literal("RSA-OAEP-256").optional(),
  n: z.string().min(1), // modulus
  e: z.string().min(1), // exponent
  ext: z.boolean().optional(),
});

export const SignUpSchema = z.object({
  fullName: z.string()
    .min(2, "Full name must be at least 2 characters")
    .max(50, "Full name cannot exceed 50 characters")
    .regex(/^[a-zA-Z\s]+$/, "Full name can only contain letters and spaces"),

  email: z.string()
    .email("Invalid email format")
    .max(100, "Email cannot exceed 100 characters"),

  password: z.string()
    .min(6, "Password must be at least 6 characters")
    .max(128, "Password cannot exceed 128 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"),

  publicKey: RSAPublicKeyJWKSchema
});

export const LoginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required")
});

export const UpdateProfileSchema = z.object({
  profilePic: z.string().url("Invalid image URL").optional()
});

// Message validation schema
export const MessageSchema = z.object({
  text: z.string().max(1000, "Message cannot exceed 1000 characters"),
  image: z.string().optional().nullable(),
  iv: z.string().min(1, "IV is required"),
  receiverEncryptedKey: z.string().min(1, "Receiver encrypted key is required"),
  senderEncryptedKey: z.string().min(1, "Sender encrypted key is required"),
}).superRefine((data, ctx) => {
  // If no image, then text must be non-empty
  if (!data.image && (!data.text || data.text.trim() === "")) {
    ctx.addIssue({
      path: ["text"],
      code: z.ZodIssueCode.custom,
      message: "Message cannot be empty when no image is provided",
    });
  }
});

export const SaveKeySchema = z.object({
  key: z.string().min(1, "Key is required")
});


