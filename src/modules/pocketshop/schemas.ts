import { z } from "zod";
import { passwordSchema } from "@/modules/auth/schemas";
import { isValidSlug, normalizeSku } from "./lib/slugs";

const optionalText = (max: number) => z.union([z.string().trim().max(max), z.literal("")]).optional().transform((value) => value || null);

export const pocketRegisterSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.email().max(254),
  phone: z.string().trim().min(7).max(30),
  password: passwordSchema,
  storeName: z.string().trim().min(2).max(120),
});

export const pocketLoginSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(128),
});

export const storeIdentitySchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(3).max(60).refine(isValidSlug, "Choose a lowercase URL such as urban-wear (reserved names are not allowed)."),
  description: optionalText(1000),
  category: z.string().trim().min(2).max(80),
  logoUrl: z.string().max(300).nullable().optional(),
  bannerUrl: z.string().max(300).nullable().optional(),
});

export const storeBusinessSchema = z.object({
  phone: z.string().trim().min(7).max(30),
  email: z.union([z.email().max(254), z.literal("")]),
  address: z.string().trim().max(300),
  state: z.string().trim().max(80),
  city: z.string().trim().max(80),
  country: z.string().trim().min(2).max(80),
  whatsapp: z.string().trim().max(30),
});

export const storePreferencesSchema = z.object({
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  timezone: z.string().trim().min(1).max(100),
  deliveryEnabled: z.boolean(),
  pickupEnabled: z.boolean(),
  notifyEmail: z.boolean(),
  deliveryNote: optionalText(500),
});

export const paymentConfigSchema = z.object({
  methods: z.array(z.enum(["CARD", "BANK_TRANSFER", "USSD", "CASH_ON_DELIVERY"])).min(1, "Select at least one payment method."),
  paymentTiming: z.enum(["BEFORE_DELIVERY", "ON_DELIVERY", "PARTIAL"]),
  depositPercent: z.coerce.number().int().min(0).max(100),
  bankName: z.string().trim().max(100),
  accountName: z.string().trim().max(100),
  accountNumber: z.string().trim().max(30),
});

export const checkoutSchema = z.object({
  customerName: z.string().trim().min(2).max(100),
  customerPhone: z.string().trim().min(7).max(30),
  customerEmail: z.union([z.email().max(254), z.literal("")]),
  deliveryMethod: z.enum(["DELIVERY", "PICKUP"]),
  deliveryZoneId: z.string().uuid().optional().or(z.literal("")),
  address: z.string().trim().max(300),
  city: z.string().trim().max(80),
  state: z.string().trim().max(80),
  deliveryInstructions: z.string().trim().max(500),
  paymentMethod: z.enum(["CARD", "BANK_TRANSFER", "USSD", "CASH_ON_DELIVERY"]),
  idempotencyKey: z.string().uuid(),
});

export const trackOrderSchema = z.object({
  reference: z.string().trim().min(6).max(40),
  token: z.string().trim().min(20).max(100),
});

export const orderStatusSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(["CONFIRMED", "PROCESSING", "READY_FOR_PICKUP", "DISPATCHED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "FAILED_DELIVERY", "REFUNDED"]),
  note: z.string().trim().max(500),
  trackingRef: z.string().trim().max(100),
});

export const deliveryZoneSchema = z.object({
  zoneId: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(80),
  description: optionalText(300),
  fee: z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter a valid fee."),
  estimatedDays: optionalText(60),
  active: z.boolean(),
});

export const productSchema = z.object({
  name: z.string().trim().min(2).max(160),
  sku: z.string().trim().min(1).max(64).transform(normalizeSku),
  description: optionalText(2000),
  categoryId: z.string().uuid().optional().or(z.literal("")),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter a valid price."),
  compareAtPrice: z.string().trim(),
  lowStockThreshold: z.coerce.number().int().min(0).max(1_000_000),
  weightGrams: z.coerce.number().int().min(0).max(1_000_000),
  featured: z.boolean(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
  variants: z.string().max(12_000),
  imageUrls: z.string().max(3000),
});

export type PocketActionState = { error?: string; fieldErrors?: Record<string, string[]> };
