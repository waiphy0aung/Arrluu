import { z } from "zod";

export const SignUpSchema = z.object({
  fullName: z.string(),
  email: z.string().email(),
  username: z.string(),
  password: z.string().min(6),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string()
})


