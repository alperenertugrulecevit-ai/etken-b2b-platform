import { z } from "zod";

export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "Kullanıcı adı zorunludur.")
    .max(
      100,
      "Kullanıcı adı en fazla 100 karakter olabilir."
    ),

  password: z
    .string()
    .min(1, "Şifre zorunludur.")
    .max(200, "Şifre çok uzun."),

  isRfLogin: z.boolean().optional().default(false),
});

export type LoginSchemaInput = z.input<
  typeof loginSchema
>;

export type LoginSchemaOutput = z.output<
  typeof loginSchema
>;