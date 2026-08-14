import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  inet,
  integer,
  bigint,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const roleEnum = pgEnum("business_role", [
  "OWNER",
  "ADMIN",
  "BRANCH_MANAGER",
  "CASHIER",
  "STOREKEEPER",
]);

export const businesses = pgTable("businesses", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    currency: text("currency").notNull().default("NGN"),
    timezone: text("timezone").notNull().default("Africa/Lagos"),
    phone: text("phone"),
    email: text("email"),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (table) => [check("businesses_currency_code_ck", sql`char_length(${table.currency}) = 3 AND ${table.currency} = upper(${table.currency})`)],
);

export const branches = pgTable(
  "branches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    code: text("code").notNull(),
    address: text("address"),
    phone: text("phone"),
    email: text("email"),
    timezone: text("timezone").notNull(),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("branches_business_code_uq").on(table.businessId, table.code),
    uniqueIndex("branches_business_id_uq").on(table.businessId, table.id),
    index("branches_business_active_idx").on(table.businessId, table.active),
    check("branches_code_normalized_ck", sql`${table.code} = upper(${table.code}) AND ${table.code} ~ '^[A-Z0-9-]+$'`),
  ],
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    active: boolean("active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("users_email_uq").on(table.email),
    check("users_email_normalized_ck", sql`${table.email} = lower(trim(${table.email}))`),
  ],
);

export const businessMemberships = pgTable(
  "business_memberships",
  {
    businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    role: roleEnum("role").notNull(),
    permissions: text("permissions").array(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.businessId, table.userId] }),
    index("memberships_user_active_idx").on(table.userId, table.active),
    index("memberships_business_role_idx").on(table.businessId, table.role),
    check("memberships_permissions_valid_ck", sql`${table.permissions} IS NULL OR ${table.permissions} <@ ARRAY['business:manage','dashboard:read','branch:read','branch:manage','team:manage','product:manage','inventory:read','inventory:manage','pos:operate','sales:read','report:read','audit:read']::text[]`),
  ],
);

export const branchAssignments = pgTable(
  "branch_assignments",
  {
    businessId: uuid("business_id").notNull(),
    branchId: uuid("branch_id").notNull(),
    userId: uuid("user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.branchId, table.userId] }),
    foreignKey({ columns: [table.businessId, table.branchId], foreignColumns: [branches.businessId, branches.id], name: "branch_assignments_tenant_branch_fk" }).onDelete("restrict"),
    foreignKey({ columns: [table.businessId, table.userId], foreignColumns: [businessMemberships.businessId, businessMemberships.userId], name: "branch_assignments_membership_fk" }).onDelete("restrict"),
    index("branch_assignments_user_business_idx").on(table.userId, table.businessId),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    ipAddress: inet("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("sessions_token_hash_uq").on(table.tokenHash),
    index("sessions_user_expires_idx").on(table.userId, table.expiresAt),
  ],
);

export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    ipAddress: inet("ip_address"),
    successful: boolean("successful").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("login_attempts_email_created_idx").on(table.email, table.createdAt)],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id").notNull(),
    branchId: uuid("branch_id"),
    userId: uuid("user_id").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    ipAddress: inet("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({ columns: [table.businessId, table.branchId], foreignColumns: [branches.businessId, branches.id], name: "audit_logs_tenant_branch_fk" }).onDelete("restrict"),
    foreignKey({ columns: [table.businessId, table.userId], foreignColumns: [businessMemberships.businessId, businessMemberships.userId], name: "audit_logs_membership_fk" }).onDelete("restrict"),
    index("audit_business_created_idx").on(table.businessId, table.createdAt),
    index("audit_entity_idx").on(table.entityType, table.entityId),
  ],
);

export type BusinessRole = (typeof roleEnum.enumValues)[number];

export const stockMovementTypeEnum = pgEnum("stock_movement_type", ["OPENING_STOCK", "STOCK_RECEIVED", "SALE", "SALE_RETURN", "TRANSFER_OUT", "TRANSFER_IN", "DAMAGE", "ADJUSTMENT_IN", "ADJUSTMENT_OUT", "CORRECTION"]);
export const posSessionStatusEnum = pgEnum("pos_session_status", ["OPEN", "CLOSED"]);
export const saleStatusEnum = pgEnum("sale_status", ["COMPLETED", "VOIDED", "REFUNDED"]);
export const paymentMethodEnum = pgEnum("payment_method", ["CASH", "BANK_TRANSFER", "CARD", "MOBILE_MONEY", "OTHER"]);
export const paymentStatusEnum = pgEnum("payment_status", ["COMPLETED", "REFUNDED", "FAILED"]);
export const cashMovementTypeEnum = pgEnum("cash_movement_type", ["CASH_IN", "CASH_OUT"]);
export const transferStatusEnum = pgEnum("stock_transfer_status", ["DRAFT", "IN_TRANSIT", "RECEIVED", "CANCELLED"]);
export const inventoryCountStatusEnum = pgEnum("inventory_count_status", ["DRAFT", "COUNTING", "REVIEW", "POSTED", "CANCELLED"]);

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  active: boolean("active").notNull().default(true),
  ...timestamps,
}, (table) => [uniqueIndex("categories_business_name_uq").on(table.businessId, table.name), uniqueIndex("categories_business_id_uq").on(table.businessId, table.id), index("categories_business_active_idx").on(table.businessId, table.active)]);

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  sku: text("sku").notNull(),
  barcode: text("barcode"),
  description: text("description"),
  sellingPrice: bigint("selling_price", { mode: "bigint" }).notNull(),
  costPrice: bigint("cost_price", { mode: "bigint" }).notNull().default(sql`0`),
  unit: text("unit").notNull().default("each"),
  active: boolean("active").notNull().default(true),
  trackInventory: boolean("track_inventory").notNull().default(true),
  minimumStockLevel: integer("minimum_stock_level").notNull().default(0),
  ...timestamps,
}, (table) => [
  uniqueIndex("products_business_sku_uq").on(table.businessId, table.sku),
  uniqueIndex("products_business_barcode_uq").on(table.businessId, table.barcode).where(sql`${table.barcode} IS NOT NULL`),
  uniqueIndex("products_business_id_uq").on(table.businessId, table.id),
  foreignKey({ columns: [table.businessId, table.categoryId], foreignColumns: [categories.businessId, categories.id], name: "products_tenant_category_fk" }).onDelete("restrict"),
  index("products_business_name_idx").on(table.businessId, table.name),
  check("products_prices_nonnegative_ck", sql`${table.sellingPrice} >= 0 AND ${table.costPrice} >= 0`),
  check("products_minimum_stock_nonnegative_ck", sql`${table.minimumStockLevel} >= 0`),
]);

export const branchInventory = pgTable("branch_inventory", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }),
  branchId: uuid("branch_id").notNull().references(() => branches.id, { onDelete: "restrict" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
  quantityOnHand: integer("quantity_on_hand").notNull().default(0),
  reorderLevel: integer("reorder_level").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("branch_inventory_branch_product_uq").on(table.branchId, table.productId),
  foreignKey({ columns: [table.businessId, table.branchId], foreignColumns: [branches.businessId, branches.id], name: "branch_inventory_tenant_branch_fk" }).onDelete("restrict"),
  foreignKey({ columns: [table.businessId, table.productId], foreignColumns: [products.businessId, products.id], name: "branch_inventory_tenant_product_fk" }).onDelete("restrict"),
  index("branch_inventory_business_branch_idx").on(table.businessId, table.branchId),
  check("branch_inventory_quantity_nonnegative_ck", sql`${table.quantityOnHand} >= 0`),
  check("branch_inventory_reorder_nonnegative_ck", sql`${table.reorderLevel} >= 0`),
]);

export const inventoryCounts = pgTable("inventory_counts", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }),
  branchId: uuid("branch_id").notNull().references(() => branches.id, { onDelete: "restrict" }),
  countNumber: text("count_number").notNull(),
  status: inventoryCountStatusEnum("status").notNull().default("DRAFT"),
  notes: text("notes"),
  createdBy: uuid("created_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  startedBy: uuid("started_by").references(() => users.id, { onDelete: "restrict" }),
  reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "restrict" }),
  postedBy: uuid("posted_by").references(() => users.id, { onDelete: "restrict" }),
  startedAt: timestamp("started_at", { withTimezone: true }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  postedAt: timestamp("posted_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  uniqueIndex("inventory_counts_business_number_uq").on(table.businessId, table.countNumber),
  uniqueIndex("inventory_counts_business_branch_id_uq").on(table.businessId, table.branchId, table.id),
  uniqueIndex("inventory_counts_branch_open_uq").on(table.branchId).where(sql`${table.status} in ('DRAFT','COUNTING','REVIEW')`),
  foreignKey({ columns: [table.businessId, table.branchId], foreignColumns: [branches.businessId, branches.id], name: "inventory_counts_tenant_branch_fk" }).onDelete("restrict"),
  foreignKey({ columns: [table.businessId, table.createdBy], foreignColumns: [businessMemberships.businessId, businessMemberships.userId], name: "inventory_counts_creator_membership_fk" }).onDelete("restrict"),
  foreignKey({ columns: [table.businessId, table.startedBy], foreignColumns: [businessMemberships.businessId, businessMemberships.userId], name: "inventory_counts_starter_membership_fk" }).onDelete("restrict"),
  foreignKey({ columns: [table.businessId, table.reviewedBy], foreignColumns: [businessMemberships.businessId, businessMemberships.userId], name: "inventory_counts_reviewer_membership_fk" }).onDelete("restrict"),
  foreignKey({ columns: [table.businessId, table.postedBy], foreignColumns: [businessMemberships.businessId, businessMemberships.userId], name: "inventory_counts_poster_membership_fk" }).onDelete("restrict"),
  index("inventory_counts_business_branch_created_idx").on(table.businessId, table.branchId, table.createdAt),
]);

export const inventoryCountItems = pgTable("inventory_count_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }),
  branchId: uuid("branch_id").notNull().references(() => branches.id, { onDelete: "restrict" }),
  countId: uuid("count_id").notNull().references(() => inventoryCounts.id, { onDelete: "restrict" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
  productNameSnapshot: text("product_name_snapshot").notNull(),
  skuSnapshot: text("sku_snapshot").notNull(),
  expectedQuantity: integer("expected_quantity").notNull(),
  countedQuantity: integer("counted_quantity"),
  varianceQuantity: integer("variance_quantity"),
  postingQuantityBefore: integer("posting_quantity_before"),
  postedAdjustment: integer("posted_adjustment"),
  notes: text("notes"),
  countedBy: uuid("counted_by").references(() => users.id, { onDelete: "restrict" }),
  countedAt: timestamp("counted_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  uniqueIndex("inventory_count_items_count_product_uq").on(table.countId, table.productId),
  foreignKey({ columns: [table.businessId, table.branchId, table.countId], foreignColumns: [inventoryCounts.businessId, inventoryCounts.branchId, inventoryCounts.id], name: "inventory_count_items_tenant_count_fk" }).onDelete("restrict"),
  foreignKey({ columns: [table.businessId, table.productId], foreignColumns: [products.businessId, products.id], name: "inventory_count_items_tenant_product_fk" }).onDelete("restrict"),
  foreignKey({ columns: [table.businessId, table.countedBy], foreignColumns: [businessMemberships.businessId, businessMemberships.userId], name: "inventory_count_items_counter_membership_fk" }).onDelete("restrict"),
  index("inventory_count_items_business_branch_idx").on(table.businessId, table.branchId),
  check("inventory_count_items_quantities_ck", sql`${table.expectedQuantity} >= 0 AND (${table.countedQuantity} IS NULL OR ${table.countedQuantity} >= 0) AND ((${table.countedQuantity} IS NULL AND ${table.varianceQuantity} IS NULL) OR (${table.countedQuantity} IS NOT NULL AND ${table.varianceQuantity} = ${table.countedQuantity} - ${table.expectedQuantity})) AND ((${table.postingQuantityBefore} IS NULL AND ${table.postedAdjustment} IS NULL) OR (${table.countedQuantity} IS NOT NULL AND ${table.postingQuantityBefore} >= 0 AND ${table.postedAdjustment} = ${table.countedQuantity} - ${table.postingQuantityBefore}))`),
]);

export const stockMovements = pgTable("stock_movements", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }),
  branchId: uuid("branch_id").notNull().references(() => branches.id, { onDelete: "restrict" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
  movementType: stockMovementTypeEnum("movement_type").notNull(),
  quantity: integer("quantity").notNull(),
  quantityBefore: integer("quantity_before").notNull(),
  quantityAfter: integer("quantity_after").notNull(),
  referenceType: text("reference_type").notNull(),
  referenceId: uuid("reference_id").notNull(),
  reason: text("reason"),
  performedBy: uuid("performed_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [foreignKey({columns:[table.businessId,table.branchId],foreignColumns:[branches.businessId,branches.id],name:"stock_movements_tenant_branch_fk"}).onDelete("restrict"),foreignKey({columns:[table.businessId,table.productId],foreignColumns:[products.businessId,products.id],name:"stock_movements_tenant_product_fk"}).onDelete("restrict"),foreignKey({columns:[table.businessId,table.performedBy],foreignColumns:[businessMemberships.businessId,businessMemberships.userId],name:"stock_movements_membership_fk"}).onDelete("restrict"),index("stock_movements_business_branch_created_idx").on(table.businessId, table.branchId, table.createdAt), index("stock_movements_product_created_idx").on(table.productId, table.createdAt), check("stock_movements_balance_ck", sql`${table.quantityAfter} = ${table.quantityBefore} + ${table.quantity} AND ${table.quantity} <> 0 AND ${table.quantityAfter} >= 0`)]);

export const stockReceipts = pgTable("stock_receipts", {
  id: uuid("id").primaryKey().defaultRandom(), businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }), branchId: uuid("branch_id").notNull().references(() => branches.id, { onDelete: "restrict" }), receiptNumber: text("receipt_number").notNull(), supplierReference: text("supplier_reference"), notes: text("notes"), receivedBy: uuid("received_by").notNull().references(() => users.id, { onDelete: "restrict" }), receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [foreignKey({columns:[table.businessId,table.branchId],foreignColumns:[branches.businessId,branches.id],name:"stock_receipts_tenant_branch_fk"}).onDelete("restrict"),foreignKey({columns:[table.businessId,table.receivedBy],foreignColumns:[businessMemberships.businessId,businessMemberships.userId],name:"stock_receipts_membership_fk"}).onDelete("restrict"),uniqueIndex("stock_receipts_business_number_uq").on(table.businessId, table.receiptNumber), index("stock_receipts_branch_received_idx").on(table.branchId, table.receivedAt)]);

export const stockReceiptItems = pgTable("stock_receipt_items", {
  id: uuid("id").primaryKey().defaultRandom(), receiptId: uuid("receipt_id").notNull().references(() => stockReceipts.id, { onDelete: "restrict" }), productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "restrict" }), quantity: integer("quantity").notNull(), unitCost: bigint("unit_cost", { mode: "bigint" }).notNull().default(sql`0`),
}, (table) => [uniqueIndex("stock_receipt_items_receipt_product_uq").on(table.receiptId, table.productId), check("stock_receipt_items_values_ck", sql`${table.quantity} > 0 AND ${table.unitCost} >= 0`)]);

export const posSessions = pgTable("pos_sessions", {
  id: uuid("id").primaryKey().defaultRandom(), businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }), branchId: uuid("branch_id").notNull().references(() => branches.id, { onDelete: "restrict" }), cashierId: uuid("cashier_id").notNull().references(() => users.id, { onDelete: "restrict" }), openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(), closedAt: timestamp("closed_at", { withTimezone: true }), openingCash: bigint("opening_cash", { mode: "bigint" }).notNull().default(sql`0`), expectedCash: bigint("expected_cash", { mode: "bigint" }), actualCash: bigint("actual_cash", { mode: "bigint" }), cashDifference: bigint("cash_difference", { mode: "bigint" }), status: posSessionStatusEnum("status").notNull().default("OPEN"),
}, (table) => [uniqueIndex("pos_sessions_cashier_branch_open_uq").on(table.cashierId, table.branchId).where(sql`${table.status} = 'OPEN'`),uniqueIndex("pos_sessions_business_branch_id_uq").on(table.businessId,table.branchId,table.id),foreignKey({columns:[table.businessId,table.branchId],foreignColumns:[branches.businessId,branches.id],name:"pos_sessions_tenant_branch_fk"}).onDelete("restrict"),foreignKey({columns:[table.businessId,table.cashierId],foreignColumns:[businessMemberships.businessId,businessMemberships.userId],name:"pos_sessions_membership_fk"}).onDelete("restrict"), index("pos_sessions_business_branch_opened_idx").on(table.businessId, table.branchId, table.openedAt), check("pos_sessions_money_nonnegative_ck", sql`${table.openingCash} >= 0 AND (${table.actualCash} IS NULL OR ${table.actualCash} >= 0)`)]);

export const cashMovements = pgTable("cash_movements", {
  id: uuid("id").primaryKey().defaultRandom(), businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }), branchId: uuid("branch_id").notNull().references(() => branches.id, { onDelete: "restrict" }), posSessionId: uuid("pos_session_id").notNull().references(() => posSessions.id, { onDelete: "restrict" }), type: cashMovementTypeEnum("type").notNull(), amount: bigint("amount", { mode: "bigint" }).notNull(), reason: text("reason").notNull(), performedBy: uuid("performed_by").notNull().references(() => users.id, { onDelete: "restrict" }), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [foreignKey({columns:[table.businessId,table.branchId],foreignColumns:[branches.businessId,branches.id],name:"cash_movements_tenant_branch_fk"}).onDelete("restrict"),foreignKey({columns:[table.businessId,table.branchId,table.posSessionId],foreignColumns:[posSessions.businessId,posSessions.branchId,posSessions.id],name:"cash_movements_tenant_session_fk"}).onDelete("restrict"),foreignKey({columns:[table.businessId,table.performedBy],foreignColumns:[businessMemberships.businessId,businessMemberships.userId],name:"cash_movements_membership_fk"}).onDelete("restrict"),index("cash_movements_session_created_idx").on(table.posSessionId, table.createdAt), check("cash_movements_amount_positive_ck", sql`${table.amount} > 0`)]);

export const sales = pgTable("sales", {
  id: uuid("id").primaryKey().defaultRandom(), businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }), branchId: uuid("branch_id").notNull().references(() => branches.id, { onDelete: "restrict" }), posSessionId: uuid("pos_session_id").notNull().references(() => posSessions.id, { onDelete: "restrict" }), cashierId: uuid("cashier_id").notNull().references(() => users.id, { onDelete: "restrict" }), saleNumber: text("sale_number").notNull(), subtotal: bigint("subtotal", { mode: "bigint" }).notNull(), discountTotal: bigint("discount_total", { mode: "bigint" }).notNull().default(sql`0`), taxTotal: bigint("tax_total", { mode: "bigint" }).notNull().default(sql`0`), total: bigint("total", { mode: "bigint" }).notNull(), status: saleStatusEnum("status").notNull().default("COMPLETED"), idempotencyKey: text("idempotency_key").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("sales_business_number_uq").on(table.businessId, table.saleNumber), uniqueIndex("sales_business_idempotency_uq").on(table.businessId, table.idempotencyKey),uniqueIndex("sales_business_branch_id_uq").on(table.businessId,table.branchId,table.id),foreignKey({columns:[table.businessId,table.branchId],foreignColumns:[branches.businessId,branches.id],name:"sales_tenant_branch_fk"}).onDelete("restrict"),foreignKey({columns:[table.businessId,table.branchId,table.posSessionId],foreignColumns:[posSessions.businessId,posSessions.branchId,posSessions.id],name:"sales_tenant_session_fk"}).onDelete("restrict"),foreignKey({columns:[table.businessId,table.cashierId],foreignColumns:[businessMemberships.businessId,businessMemberships.userId],name:"sales_membership_fk"}).onDelete("restrict"), index("sales_business_branch_created_idx").on(table.businessId, table.branchId, table.createdAt), index("sales_cashier_created_idx").on(table.cashierId, table.createdAt), check("sales_totals_ck", sql`${table.subtotal} >= 0 AND ${table.discountTotal} >= 0 AND ${table.taxTotal} >= 0 AND ${table.total} = ${table.subtotal} - ${table.discountTotal} + ${table.taxTotal} AND ${table.total} >= 0`)]);

export const saleItems = pgTable("sale_items", {
  id: uuid("id").primaryKey().defaultRandom(), saleId: uuid("sale_id").notNull().references(() => sales.id, { onDelete: "restrict" }), productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "restrict" }), productNameSnapshot: text("product_name_snapshot").notNull(), skuSnapshot: text("sku_snapshot").notNull(), quantity: integer("quantity").notNull(), unitPrice: bigint("unit_price", { mode: "bigint" }).notNull(), costPriceSnapshot: bigint("cost_price_snapshot", { mode: "bigint" }).notNull(), discount: bigint("discount", { mode: "bigint" }).notNull().default(sql`0`), lineTotal: bigint("line_total", { mode: "bigint" }).notNull(),
}, (table) => [index("sale_items_sale_idx").on(table.saleId), index("sale_items_product_idx").on(table.productId), check("sale_items_values_ck", sql`${table.quantity} > 0 AND ${table.unitPrice} >= 0 AND ${table.costPriceSnapshot} >= 0 AND ${table.discount} >= 0 AND ${table.lineTotal} = ${table.quantity} * ${table.unitPrice} - ${table.discount} AND ${table.lineTotal} >= 0`)]);

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(), businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }), branchId: uuid("branch_id").notNull().references(() => branches.id, { onDelete: "restrict" }), saleId: uuid("sale_id").notNull().references(() => sales.id, { onDelete: "restrict" }), posSessionId: uuid("pos_session_id").notNull().references(() => posSessions.id, { onDelete: "restrict" }), paymentMethod: paymentMethodEnum("payment_method").notNull(), amount: bigint("amount", { mode: "bigint" }).notNull(), reference: text("reference"), status: paymentStatusEnum("status").notNull().default("COMPLETED"), receivedBy: uuid("received_by").notNull().references(() => users.id, { onDelete: "restrict" }), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [foreignKey({columns:[table.businessId,table.branchId],foreignColumns:[branches.businessId,branches.id],name:"payments_tenant_branch_fk"}).onDelete("restrict"),foreignKey({columns:[table.businessId,table.branchId,table.saleId],foreignColumns:[sales.businessId,sales.branchId,sales.id],name:"payments_tenant_sale_fk"}).onDelete("restrict"),foreignKey({columns:[table.businessId,table.branchId,table.posSessionId],foreignColumns:[posSessions.businessId,posSessions.branchId,posSessions.id],name:"payments_tenant_session_fk"}).onDelete("restrict"),foreignKey({columns:[table.businessId,table.receivedBy],foreignColumns:[businessMemberships.businessId,businessMemberships.userId],name:"payments_membership_fk"}).onDelete("restrict"),index("payments_business_branch_created_idx").on(table.businessId, table.branchId, table.createdAt), index("payments_sale_idx").on(table.saleId), index("payments_session_method_idx").on(table.posSessionId, table.paymentMethod), check("payments_amount_positive_ck", sql`${table.amount} > 0`)]);

export const stockTransfers = pgTable("stock_transfers", {
  id: uuid("id").primaryKey().defaultRandom(), businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }), sourceBranchId: uuid("source_branch_id").notNull().references(() => branches.id, { onDelete: "restrict" }), destinationBranchId: uuid("destination_branch_id").notNull().references(() => branches.id, { onDelete: "restrict" }), transferNumber: text("transfer_number").notNull(), status: transferStatusEnum("status").notNull().default("DRAFT"), initiatedBy: uuid("initiated_by").notNull().references(() => users.id, { onDelete: "restrict" }), dispatchedBy: uuid("dispatched_by").references(() => users.id, { onDelete: "restrict" }), receivedBy: uuid("received_by").references(() => users.id, { onDelete: "restrict" }), notes: text("notes"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), dispatchedAt: timestamp("dispatched_at", { withTimezone: true }), receivedAt: timestamp("received_at", { withTimezone: true }),
}, (table) => [foreignKey({columns:[table.businessId,table.sourceBranchId],foreignColumns:[branches.businessId,branches.id],name:"stock_transfers_tenant_source_fk"}).onDelete("restrict"),foreignKey({columns:[table.businessId,table.destinationBranchId],foreignColumns:[branches.businessId,branches.id],name:"stock_transfers_tenant_destination_fk"}).onDelete("restrict"),foreignKey({columns:[table.businessId,table.initiatedBy],foreignColumns:[businessMemberships.businessId,businessMemberships.userId],name:"stock_transfers_initiator_membership_fk"}).onDelete("restrict"),uniqueIndex("stock_transfers_business_number_uq").on(table.businessId, table.transferNumber), index("stock_transfers_business_status_created_idx").on(table.businessId, table.status, table.createdAt), check("stock_transfers_distinct_branches_ck", sql`${table.sourceBranchId} <> ${table.destinationBranchId}`)]);

export const stockTransferItems = pgTable("stock_transfer_items", {
  id: uuid("id").primaryKey().defaultRandom(), transferId: uuid("transfer_id").notNull().references(() => stockTransfers.id, { onDelete: "restrict" }), productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "restrict" }), quantity: integer("quantity").notNull(),
}, (table) => [uniqueIndex("stock_transfer_items_transfer_product_uq").on(table.transferId, table.productId), check("stock_transfer_items_quantity_positive_ck", sql`${table.quantity} > 0`)]);

export const saleReversals = pgTable("sale_reversals", {
  id: uuid("id").primaryKey().defaultRandom(), businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }), branchId: uuid("branch_id").notNull().references(() => branches.id, { onDelete: "restrict" }), saleId: uuid("sale_id").notNull().references(() => sales.id, { onDelete: "restrict" }), reason: text("reason").notNull(), reversedBy: uuid("reversed_by").notNull().references(() => users.id, { onDelete: "restrict" }), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [foreignKey({columns:[table.businessId,table.branchId],foreignColumns:[branches.businessId,branches.id],name:"sale_reversals_tenant_branch_fk"}).onDelete("restrict"),foreignKey({columns:[table.businessId,table.branchId,table.saleId],foreignColumns:[sales.businessId,sales.branchId,sales.id],name:"sale_reversals_tenant_sale_fk"}).onDelete("restrict"),foreignKey({columns:[table.businessId,table.reversedBy],foreignColumns:[businessMemberships.businessId,businessMemberships.userId],name:"sale_reversals_membership_fk"}).onDelete("restrict"),uniqueIndex("sale_reversals_sale_uq").on(table.saleId), index("sale_reversals_business_created_idx").on(table.businessId, table.createdAt)]);

export type PaymentMethod = (typeof paymentMethodEnum.enumValues)[number];
