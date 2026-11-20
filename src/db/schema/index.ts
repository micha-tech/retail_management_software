import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  inet,
  integer,
  numeric,
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
    check("memberships_permissions_valid_ck", sql`${table.permissions} IS NULL OR ${table.permissions} <@ ARRAY['business:manage','dashboard:read','branch:read','branch:manage','team:manage','product:manage','inventory:read','inventory:manage','purchasing:read','purchasing:manage','pos:operate','sales:read','credit:manage','report:read','audit:read']::text[]`),
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

export const demoRequests = pgTable("demo_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  fullName: text("full_name").notNull(),
  workEmail: text("work_email").notNull(),
  phone: text("phone").notNull(),
  businessName: text("business_name").notNull(),
  businessType: text("business_type").notNull(),
  locationCount: text("location_count").notNull(),
  employeeCount: text("employee_count").notNull(),
  currentSoftware: text("current_software"),
  primaryChallenge: text("primary_challenge").notNull(),
  preferredContact: text("preferred_contact").notNull(),
  message: text("message"),
  consent: boolean("consent").notNull().default(false),
  status: text("status").notNull().default("NEW"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("demo_requests_created_idx").on(table.createdAt),
  index("demo_requests_email_created_idx").on(table.workEmail, table.createdAt),
  check("demo_requests_email_normalized_ck", sql`${table.workEmail} = lower(trim(${table.workEmail}))`),
]);

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

export const subscriptionStatusEnum = pgEnum("subscription_status", ["TRIALING", "ACTIVE", "PAST_DUE", "SUSPENDED", "CANCELED"]);
export const billingIntervalEnum = pgEnum("billing_interval", ["MONTHLY", "ANNUAL", "MANUAL"]);

export const businessSubscriptions = pgTable("business_subscriptions", {
  businessId: uuid("business_id").primaryKey().references(() => businesses.id, { onDelete: "restrict" }),
  planCode: text("plan_code").notNull().default("trial"),
  status: subscriptionStatusEnum("status").notNull().default("TRIALING"),
  billingInterval: billingIntervalEnum("billing_interval").notNull().default("MONTHLY"),
  amount: bigint("amount", { mode: "bigint" }).notNull().default(sql`0`),
  currency: text("currency").notNull().default("NGN"),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  currentPeriodStartsAt: timestamp("current_period_starts_at", { withTimezone: true }),
  currentPeriodEndsAt: timestamp("current_period_ends_at", { withTimezone: true }),
  gracePeriodEndsAt: timestamp("grace_period_ends_at", { withTimezone: true }),
  branchLimit: integer("branch_limit"),
  employeeLimit: integer("employee_limit"),
  provider: text("provider"),
  providerCustomerId: text("provider_customer_id"),
  providerSubscriptionId: text("provider_subscription_id"),
  notes: text("notes"),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "restrict" }),
  ...timestamps,
}, (table) => [
  index("subscriptions_status_period_idx").on(table.status, table.currentPeriodEndsAt),
  uniqueIndex("subscriptions_provider_subscription_uq").on(table.provider, table.providerSubscriptionId).where(sql`${table.providerSubscriptionId} IS NOT NULL`),
  check("subscriptions_plan_code_ck", sql`${table.planCode} = lower(trim(${table.planCode})) AND ${table.planCode} ~ '^[a-z0-9][a-z0-9_-]{1,49}$'`),
  check("subscriptions_amount_nonnegative_ck", sql`${table.amount} >= 0`),
  check("subscriptions_currency_code_ck", sql`char_length(${table.currency}) = 3 AND ${table.currency} = upper(${table.currency})`),
  check("subscriptions_limits_positive_ck", sql`(${table.branchLimit} IS NULL OR ${table.branchLimit} > 0) AND (${table.employeeLimit} IS NULL OR ${table.employeeLimit} > 0)`),
]);

export const subscriptionEvents = pgTable("subscription_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }),
  actorUserId: uuid("actor_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  action: text("action").notNull(),
  previousState: jsonb("previous_state").notNull().default({}),
  nextState: jsonb("next_state").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("subscription_events_business_created_idx").on(table.businessId, table.createdAt),
  index("subscription_events_actor_created_idx").on(table.actorUserId, table.createdAt),
]);

export const stockMovementTypeEnum = pgEnum("stock_movement_type", ["OPENING_STOCK", "STOCK_RECEIVED", "SALE", "SALE_RETURN", "TRANSFER_OUT", "TRANSFER_IN", "DAMAGE", "ADJUSTMENT_IN", "ADJUSTMENT_OUT", "CORRECTION"]);
export const posSessionStatusEnum = pgEnum("pos_session_status", ["OPEN", "CLOSED"]);
export const saleStatusEnum = pgEnum("sale_status", ["COMPLETED", "VOIDED", "REFUNDED"]);
export const paymentMethodEnum = pgEnum("payment_method", ["CASH", "BANK_TRANSFER", "CARD", "MOBILE_MONEY", "OTHER"]);
export const paymentStatusEnum = pgEnum("payment_status", ["COMPLETED", "REFUNDED", "FAILED"]);
export const creditEntryTypeEnum = pgEnum("credit_entry_type", ["SALE", "PAYMENT", "ADJUSTMENT_IN", "ADJUSTMENT_OUT", "REVERSAL"]);
export const cashMovementTypeEnum = pgEnum("cash_movement_type", ["CASH_IN", "CASH_OUT"]);
export const transferStatusEnum = pgEnum("stock_transfer_status", ["DRAFT", "IN_TRANSIT", "RECEIVED", "CANCELLED"]);
export const inventoryCountStatusEnum = pgEnum("inventory_count_status", ["DRAFT", "COUNTING", "REVIEW", "POSTED", "CANCELLED"]);
export const purchaseOrderStatusEnum = pgEnum("purchase_order_status", ["DRAFT", "ORDERED", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"]);
export const operationalAlertTypeEnum = pgEnum("operational_alert_type", ["INVENTORY_VARIANCE"]);
export const operationalAlertSeverityEnum = pgEnum("operational_alert_severity", ["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export const operationalAlertStatusEnum = pgEnum("operational_alert_status", ["OPEN", "ACKNOWLEDGED", "IN_REVIEW", "RESOLVED", "DISMISSED"]);

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
  minimumStockLevel: numeric("minimum_stock_level", { precision: 14, scale: 3, mode: "number" }).notNull().default(0),
  allowFractionalQuantity: boolean("allow_fractional_quantity").notNull().default(true),
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
  quantityOnHand: numeric("quantity_on_hand", { precision: 14, scale: 3, mode: "number" }).notNull().default(0),
  reorderLevel: numeric("reorder_level", { precision: 14, scale: 3, mode: "number" }).notNull().default(0),
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
  correctsCountId: uuid("corrects_count_id"),
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
  foreignKey({ columns: [table.businessId, table.branchId, table.correctsCountId], foreignColumns: [table.businessId, table.branchId, table.id], name: "inventory_counts_corrected_count_fk" }).onDelete("set null"),
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
  expectedQuantity: numeric("expected_quantity", { precision: 14, scale: 3, mode: "number" }).notNull(),
  countedQuantity: numeric("counted_quantity", { precision: 14, scale: 3, mode: "number" }),
  varianceQuantity: numeric("variance_quantity", { precision: 14, scale: 3, mode: "number" }),
  postingQuantityBefore: numeric("posting_quantity_before", { precision: 14, scale: 3, mode: "number" }),
  postedAdjustment: numeric("posted_adjustment", { precision: 14, scale: 3, mode: "number" }),
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
  quantity: numeric("quantity", { precision: 14, scale: 3, mode: "number" }).notNull(),
  quantityBefore: numeric("quantity_before", { precision: 14, scale: 3, mode: "number" }).notNull(),
  quantityAfter: numeric("quantity_after", { precision: 14, scale: 3, mode: "number" }).notNull(),
  referenceType: text("reference_type").notNull(),
  referenceId: uuid("reference_id").notNull(),
  reason: text("reason"),
  performedBy: uuid("performed_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [foreignKey({columns:[table.businessId,table.branchId],foreignColumns:[branches.businessId,branches.id],name:"stock_movements_tenant_branch_fk"}).onDelete("restrict"),foreignKey({columns:[table.businessId,table.productId],foreignColumns:[products.businessId,products.id],name:"stock_movements_tenant_product_fk"}).onDelete("restrict"),foreignKey({columns:[table.businessId,table.performedBy],foreignColumns:[businessMemberships.businessId,businessMemberships.userId],name:"stock_movements_membership_fk"}).onDelete("restrict"),index("stock_movements_business_branch_created_idx").on(table.businessId, table.branchId, table.createdAt), index("stock_movements_product_created_idx").on(table.productId, table.createdAt), check("stock_movements_balance_ck", sql`${table.quantityAfter} = ${table.quantityBefore} + ${table.quantity} AND ${table.quantity} <> 0 AND ${table.quantityAfter} >= 0`)]);

export const operationalAlerts = pgTable("operational_alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }),
  branchId: uuid("branch_id").notNull().references(() => branches.id, { onDelete: "restrict" }),
  type: operationalAlertTypeEnum("type").notNull(),
  severity: operationalAlertSeverityEnum("severity").notNull(),
  status: operationalAlertStatusEnum("status").notNull().default("OPEN"),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  title: text("title").notNull(),
  reason: text("reason").notNull(),
  recommendation: text("recommendation").notNull(),
  supportingData: jsonb("supporting_data").notNull().default({}),
  createdBy: uuid("created_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  acknowledgedBy: uuid("acknowledged_by").references(() => users.id, { onDelete: "restrict" }),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  resolvedBy: uuid("resolved_by").references(() => users.id, { onDelete: "restrict" }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  dismissedBy: uuid("dismissed_by").references(() => users.id, { onDelete: "restrict" }),
  dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  uniqueIndex("operational_alerts_business_type_entity_uq").on(table.businessId, table.type, table.entityId),
  foreignKey({ columns: [table.businessId, table.branchId], foreignColumns: [branches.businessId, branches.id], name: "operational_alerts_tenant_branch_fk" }).onDelete("restrict"),
  foreignKey({ columns: [table.businessId, table.createdBy], foreignColumns: [businessMemberships.businessId, businessMemberships.userId], name: "operational_alerts_creator_membership_fk" }).onDelete("restrict"),
  foreignKey({ columns: [table.businessId, table.acknowledgedBy], foreignColumns: [businessMemberships.businessId, businessMemberships.userId], name: "operational_alerts_acknowledger_membership_fk" }).onDelete("restrict"),
  foreignKey({ columns: [table.businessId, table.resolvedBy], foreignColumns: [businessMemberships.businessId, businessMemberships.userId], name: "operational_alerts_resolver_membership_fk" }).onDelete("restrict"),
  foreignKey({ columns: [table.businessId, table.dismissedBy], foreignColumns: [businessMemberships.businessId, businessMemberships.userId], name: "operational_alerts_dismisser_membership_fk" }).onDelete("restrict"),
  index("operational_alerts_business_status_created_idx").on(table.businessId, table.status, table.createdAt),
]);

export const suppliers = pgTable("suppliers", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }),
  name: text("name").notNull(), contactName: text("contact_name"), phone: text("phone"), email: text("email"), address: text("address"), taxId: text("tax_id"), paymentTermsDays: integer("payment_terms_days").notNull().default(0), leadTimeDays: integer("lead_time_days").notNull().default(0), notes: text("notes"), active: boolean("active").notNull().default(true), ...timestamps,
}, (table) => [uniqueIndex("suppliers_business_name_uq").on(table.businessId,table.name),uniqueIndex("suppliers_business_id_uq").on(table.businessId,table.id),index("suppliers_business_active_idx").on(table.businessId,table.active),check("suppliers_terms_nonnegative_ck",sql`${table.paymentTermsDays} >= 0 AND ${table.leadTimeDays} >= 0`)]);

export const purchaseOrders = pgTable("purchase_orders", {
  id: uuid("id").primaryKey().defaultRandom(), businessId: uuid("business_id").notNull().references(() => businesses.id,{onDelete:"restrict"}), branchId: uuid("branch_id").notNull().references(() => branches.id,{onDelete:"restrict"}), supplierId: uuid("supplier_id").notNull().references(() => suppliers.id,{onDelete:"restrict"}), orderNumber: text("order_number").notNull(), supplierReference: text("supplier_reference"), status: purchaseOrderStatusEnum("status").notNull().default("DRAFT"), expectedAt: timestamp("expected_at",{withTimezone:true}), orderedAt: timestamp("ordered_at",{withTimezone:true}), completedAt: timestamp("completed_at",{withTimezone:true}), cancelledAt: timestamp("cancelled_at",{withTimezone:true}), notes: text("notes"), createdBy: uuid("created_by").notNull().references(() => users.id,{onDelete:"restrict"}), orderedBy: uuid("ordered_by").references(() => users.id,{onDelete:"restrict"}), ...timestamps,
}, (table) => [uniqueIndex("purchase_orders_business_number_uq").on(table.businessId,table.orderNumber),uniqueIndex("purchase_orders_business_id_uq").on(table.businessId,table.id),uniqueIndex("purchase_orders_business_branch_id_uq").on(table.businessId,table.branchId,table.id),foreignKey({columns:[table.businessId,table.branchId],foreignColumns:[branches.businessId,branches.id],name:"purchase_orders_tenant_branch_fk"}).onDelete("restrict"),foreignKey({columns:[table.businessId,table.supplierId],foreignColumns:[suppliers.businessId,suppliers.id],name:"purchase_orders_tenant_supplier_fk"}).onDelete("restrict"),foreignKey({columns:[table.businessId,table.createdBy],foreignColumns:[businessMemberships.businessId,businessMemberships.userId],name:"purchase_orders_creator_membership_fk"}).onDelete("restrict"),foreignKey({columns:[table.businessId,table.orderedBy],foreignColumns:[businessMemberships.businessId,businessMemberships.userId],name:"purchase_orders_orderer_membership_fk"}).onDelete("restrict"),index("purchase_orders_business_status_created_idx").on(table.businessId,table.status,table.createdAt),index("purchase_orders_supplier_created_idx").on(table.supplierId,table.createdAt)]);

export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: uuid("id").primaryKey().defaultRandom(), purchaseOrderId: uuid("purchase_order_id").notNull().references(() => purchaseOrders.id,{onDelete:"restrict"}), productId: uuid("product_id").notNull().references(() => products.id,{onDelete:"restrict"}), productNameSnapshot: text("product_name_snapshot").notNull(), skuSnapshot: text("sku_snapshot").notNull(), orderedQuantity: numeric("ordered_quantity", { precision: 14, scale: 3, mode: "number" }).notNull(), receivedQuantity: numeric("received_quantity", { precision: 14, scale: 3, mode: "number" }).notNull().default(0), unitCost: bigint("unit_cost",{mode:"bigint"}).notNull(),
}, (table) => [uniqueIndex("purchase_order_items_order_product_uq").on(table.purchaseOrderId,table.productId),index("purchase_order_items_product_idx").on(table.productId),check("purchase_order_items_quantities_ck",sql`${table.orderedQuantity} > 0 AND ${table.receivedQuantity} >= 0 AND ${table.receivedQuantity} <= ${table.orderedQuantity} AND ${table.unitCost} >= 0`)]);

export const purchaseOrderPayments = pgTable("purchase_order_payments", {
  id: uuid("id").primaryKey().defaultRandom(), businessId: uuid("business_id").notNull().references(() => businesses.id,{onDelete:"restrict"}), purchaseOrderId: uuid("purchase_order_id").notNull(), amount: bigint("amount",{mode:"bigint"}).notNull(), paymentMethod: paymentMethodEnum("payment_method").notNull(), reference: text("reference"), notes: text("notes"), paidBy: uuid("paid_by").notNull().references(() => users.id,{onDelete:"restrict"}), paidAt: timestamp("paid_at",{withTimezone:true}).notNull().defaultNow(),
}, (table) => [foreignKey({columns:[table.businessId,table.purchaseOrderId],foreignColumns:[purchaseOrders.businessId,purchaseOrders.id],name:"purchase_order_payments_tenant_order_fk"}).onDelete("restrict"),foreignKey({columns:[table.businessId,table.paidBy],foreignColumns:[businessMemberships.businessId,businessMemberships.userId],name:"purchase_order_payments_membership_fk"}).onDelete("restrict"),index("purchase_order_payments_order_paid_idx").on(table.purchaseOrderId,table.paidAt),check("purchase_order_payments_amount_positive_ck",sql`${table.amount} > 0`)]);

export const stockReceipts = pgTable("stock_receipts", {
  id: uuid("id").primaryKey().defaultRandom(), businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }), branchId: uuid("branch_id").notNull().references(() => branches.id, { onDelete: "restrict" }), purchaseOrderId: uuid("purchase_order_id").references(() => purchaseOrders.id,{onDelete:"restrict"}), receiptNumber: text("receipt_number").notNull(), supplierReference: text("supplier_reference"), notes: text("notes"), receivedBy: uuid("received_by").notNull().references(() => users.id, { onDelete: "restrict" }), receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [foreignKey({columns:[table.businessId,table.branchId],foreignColumns:[branches.businessId,branches.id],name:"stock_receipts_tenant_branch_fk"}).onDelete("restrict"),foreignKey({columns:[table.businessId,table.purchaseOrderId],foreignColumns:[purchaseOrders.businessId,purchaseOrders.id],name:"stock_receipts_tenant_order_fk"}).onDelete("restrict"),foreignKey({columns:[table.businessId,table.receivedBy],foreignColumns:[businessMemberships.businessId,businessMemberships.userId],name:"stock_receipts_membership_fk"}).onDelete("restrict"),uniqueIndex("stock_receipts_business_number_uq").on(table.businessId, table.receiptNumber), index("stock_receipts_branch_received_idx").on(table.branchId, table.receivedAt),index("stock_receipts_purchase_order_idx").on(table.purchaseOrderId)]);

export const stockReceiptItems = pgTable("stock_receipt_items", {
  id: uuid("id").primaryKey().defaultRandom(), receiptId: uuid("receipt_id").notNull().references(() => stockReceipts.id, { onDelete: "restrict" }), productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "restrict" }), quantity: numeric("quantity", { precision: 14, scale: 3, mode: "number" }).notNull(), unitCost: bigint("unit_cost", { mode: "bigint" }).notNull().default(sql`0`),
}, (table) => [uniqueIndex("stock_receipt_items_receipt_product_uq").on(table.receiptId, table.productId), check("stock_receipt_items_values_ck", sql`${table.quantity} > 0 AND ${table.unitCost} >= 0`)]);

export const posSessions = pgTable("pos_sessions", {
  id: uuid("id").primaryKey().defaultRandom(), businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }), branchId: uuid("branch_id").notNull().references(() => branches.id, { onDelete: "restrict" }), cashierId: uuid("cashier_id").notNull().references(() => users.id, { onDelete: "restrict" }), openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(), closedAt: timestamp("closed_at", { withTimezone: true }), openingCash: bigint("opening_cash", { mode: "bigint" }).notNull().default(sql`0`), expectedCash: bigint("expected_cash", { mode: "bigint" }), actualCash: bigint("actual_cash", { mode: "bigint" }), cashDifference: bigint("cash_difference", { mode: "bigint" }), status: posSessionStatusEnum("status").notNull().default("OPEN"),
}, (table) => [uniqueIndex("pos_sessions_cashier_branch_open_uq").on(table.cashierId, table.branchId).where(sql`${table.status} = 'OPEN'`),uniqueIndex("pos_sessions_business_branch_id_uq").on(table.businessId,table.branchId,table.id),foreignKey({columns:[table.businessId,table.branchId],foreignColumns:[branches.businessId,branches.id],name:"pos_sessions_tenant_branch_fk"}).onDelete("restrict"),foreignKey({columns:[table.businessId,table.cashierId],foreignColumns:[businessMemberships.businessId,businessMemberships.userId],name:"pos_sessions_membership_fk"}).onDelete("restrict"), index("pos_sessions_business_branch_opened_idx").on(table.businessId, table.branchId, table.openedAt), check("pos_sessions_money_nonnegative_ck", sql`${table.openingCash} >= 0 AND (${table.actualCash} IS NULL OR ${table.actualCash} >= 0)`)]);

export const cashMovements = pgTable("cash_movements", {
  id: uuid("id").primaryKey().defaultRandom(), businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }), branchId: uuid("branch_id").notNull().references(() => branches.id, { onDelete: "restrict" }), posSessionId: uuid("pos_session_id").notNull().references(() => posSessions.id, { onDelete: "restrict" }), type: cashMovementTypeEnum("type").notNull(), amount: bigint("amount", { mode: "bigint" }).notNull(), reason: text("reason").notNull(), performedBy: uuid("performed_by").notNull().references(() => users.id, { onDelete: "restrict" }), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [foreignKey({columns:[table.businessId,table.branchId],foreignColumns:[branches.businessId,branches.id],name:"cash_movements_tenant_branch_fk"}).onDelete("restrict"),foreignKey({columns:[table.businessId,table.branchId,table.posSessionId],foreignColumns:[posSessions.businessId,posSessions.branchId,posSessions.id],name:"cash_movements_tenant_session_fk"}).onDelete("restrict"),foreignKey({columns:[table.businessId,table.performedBy],foreignColumns:[businessMemberships.businessId,businessMemberships.userId],name:"cash_movements_membership_fk"}).onDelete("restrict"),index("cash_movements_session_created_idx").on(table.posSessionId, table.createdAt), check("cash_movements_amount_positive_ck", sql`${table.amount} > 0`)]);

export const sales = pgTable("sales", {
  id: uuid("id").primaryKey().defaultRandom(), businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }), branchId: uuid("branch_id").notNull().references(() => branches.id, { onDelete: "restrict" }), posSessionId: uuid("pos_session_id").notNull().references(() => posSessions.id, { onDelete: "restrict" }), cashierId: uuid("cashier_id").notNull().references(() => users.id, { onDelete: "restrict" }), creditCustomerId: uuid("credit_customer_id"), saleNumber: text("sale_number").notNull(), subtotal: bigint("subtotal", { mode: "bigint" }).notNull(), discountTotal: bigint("discount_total", { mode: "bigint" }).notNull().default(sql`0`), taxTotal: bigint("tax_total", { mode: "bigint" }).notNull().default(sql`0`), total: bigint("total", { mode: "bigint" }).notNull(), status: saleStatusEnum("status").notNull().default("COMPLETED"), idempotencyKey: text("idempotency_key").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("sales_business_number_uq").on(table.businessId, table.saleNumber), uniqueIndex("sales_business_idempotency_uq").on(table.businessId, table.idempotencyKey),uniqueIndex("sales_business_branch_id_uq").on(table.businessId,table.branchId,table.id),foreignKey({columns:[table.businessId,table.branchId],foreignColumns:[branches.businessId,branches.id],name:"sales_tenant_branch_fk"}).onDelete("restrict"),foreignKey({columns:[table.businessId,table.branchId,table.posSessionId],foreignColumns:[posSessions.businessId,posSessions.branchId,posSessions.id],name:"sales_tenant_session_fk"}).onDelete("restrict"),foreignKey({columns:[table.businessId,table.cashierId],foreignColumns:[businessMemberships.businessId,businessMemberships.userId],name:"sales_membership_fk"}).onDelete("restrict"),foreignKey({columns:[table.businessId,table.creditCustomerId],foreignColumns:[creditCustomers.businessId,creditCustomers.id],name:"sales_tenant_credit_customer_fk"}).onDelete("restrict"), index("sales_business_branch_created_idx").on(table.businessId, table.branchId, table.createdAt), index("sales_cashier_created_idx").on(table.cashierId, table.createdAt), check("sales_totals_ck", sql`${table.subtotal} >= 0 AND ${table.discountTotal} >= 0 AND ${table.taxTotal} >= 0 AND ${table.total} = ${table.subtotal} - ${table.discountTotal} + ${table.taxTotal} AND ${table.total} >= 0`)]);

export const saleItems = pgTable("sale_items", {
  id: uuid("id").primaryKey().defaultRandom(), saleId: uuid("sale_id").notNull().references(() => sales.id, { onDelete: "restrict" }), productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "restrict" }), productNameSnapshot: text("product_name_snapshot").notNull(), skuSnapshot: text("sku_snapshot").notNull(), quantity: numeric("quantity", { precision: 14, scale: 3, mode: "number" }).notNull(), unitPrice: bigint("unit_price", { mode: "bigint" }).notNull(), costPriceSnapshot: bigint("cost_price_snapshot", { mode: "bigint" }).notNull(), discount: bigint("discount", { mode: "bigint" }).notNull().default(sql`0`), lineTotal: bigint("line_total", { mode: "bigint" }).notNull(),
}, (table) => [index("sale_items_sale_idx").on(table.saleId), index("sale_items_product_idx").on(table.productId), check("sale_items_values_ck", sql`${table.quantity} > 0 AND ${table.unitPrice} >= 0 AND ${table.costPriceSnapshot} >= 0 AND ${table.discount} >= 0 AND ${table.lineTotal} = round(${table.quantity} * ${table.unitPrice}) - ${table.discount} AND ${table.lineTotal} >= 0`)]);

export const paymentBanks = pgTable("payment_banks", {
  id: uuid("id").primaryKey().defaultRandom(), businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }), bankName: text("bank_name").notNull(), branchName: text("branch_name").notNull(), accountName: text("account_name").notNull(), accountNumber: text("account_number").notNull(), active: boolean("active").notNull().default(true), ...timestamps,
}, (table) => [uniqueIndex("payment_banks_business_account_uq").on(table.businessId, table.accountNumber), uniqueIndex("payment_banks_business_id_uq").on(table.businessId, table.id), index("payment_banks_business_active_idx").on(table.businessId, table.active), check("payment_banks_account_ck", sql`${table.bankName} = trim(${table.bankName}) AND char_length(${table.bankName}) > 0 AND ${table.accountName} = trim(${table.accountName}) AND char_length(${table.accountName}) > 0 AND ${table.accountNumber} ~ '^[0-9]+$'`)]);

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(), businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }), branchId: uuid("branch_id").notNull().references(() => branches.id, { onDelete: "restrict" }), saleId: uuid("sale_id").notNull().references(() => sales.id, { onDelete: "restrict" }), posSessionId: uuid("pos_session_id").notNull().references(() => posSessions.id, { onDelete: "restrict" }), paymentMethod: paymentMethodEnum("payment_method").notNull(), paymentBankId: uuid("payment_bank_id"), amount: bigint("amount", { mode: "bigint" }).notNull(), reference: text("reference"), status: paymentStatusEnum("status").notNull().default("COMPLETED"), receivedBy: uuid("received_by").notNull().references(() => users.id, { onDelete: "restrict" }), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [foreignKey({columns:[table.businessId,table.branchId],foreignColumns:[branches.businessId,branches.id],name:"payments_tenant_branch_fk"}).onDelete("restrict"),foreignKey({columns:[table.businessId,table.branchId,table.saleId],foreignColumns:[sales.businessId,sales.branchId,sales.id],name:"payments_tenant_sale_fk"}).onDelete("restrict"),foreignKey({columns:[table.businessId,table.branchId,table.posSessionId],foreignColumns:[posSessions.businessId,posSessions.branchId,posSessions.id],name:"payments_tenant_session_fk"}).onDelete("restrict"),foreignKey({columns:[table.businessId,table.paymentBankId],foreignColumns:[paymentBanks.businessId,paymentBanks.id],name:"payments_tenant_bank_fk"}).onDelete("restrict"),foreignKey({columns:[table.businessId,table.receivedBy],foreignColumns:[businessMemberships.businessId,businessMemberships.userId],name:"payments_membership_fk"}).onDelete("restrict"),index("payments_business_branch_created_idx").on(table.businessId, table.branchId, table.createdAt), index("payments_sale_idx").on(table.saleId), index("payments_session_method_idx").on(table.posSessionId, table.paymentMethod), check("payments_amount_positive_ck", sql`${table.amount} > 0`)]);

export const creditCustomers = pgTable("credit_customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  address: text("address"),
  notes: text("notes"),
  active: boolean("active").notNull().default(true),
  ...timestamps,
}, (table) => [
  uniqueIndex("credit_customers_business_phone_uq").on(table.businessId, table.phone),
  uniqueIndex("credit_customers_business_id_uq").on(table.businessId, table.id),
  index("credit_customers_business_name_idx").on(table.businessId, table.name),
  check("credit_customers_name_phone_ck", sql`${table.name} = trim(${table.name}) AND char_length(${table.name}) >= 2 AND ${table.phone} = trim(${table.phone}) AND char_length(${table.phone}) >= 7`),
]);

export const creditEntries = pgTable("credit_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }),
  branchId: uuid("branch_id").notNull().references(() => branches.id, { onDelete: "restrict" }),
  customerId: uuid("customer_id").notNull().references(() => creditCustomers.id, { onDelete: "restrict" }),
  saleId: uuid("sale_id").references(() => sales.id, { onDelete: "restrict" }),
  type: creditEntryTypeEnum("type").notNull(),
  amount: bigint("amount", { mode: "bigint" }).notNull(),
  paymentMethod: paymentMethodEnum("payment_method"),
  paymentBankId: uuid("payment_bank_id"),
  reference: text("reference"),
  notes: text("notes"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  recordedBy: uuid("recorded_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  foreignKey({ columns: [table.businessId, table.branchId], foreignColumns: [branches.businessId, branches.id], name: "credit_entries_tenant_branch_fk" }).onDelete("restrict"),
  foreignKey({ columns: [table.businessId, table.customerId], foreignColumns: [creditCustomers.businessId, creditCustomers.id], name: "credit_entries_tenant_customer_fk" }).onDelete("restrict"),
  foreignKey({ columns: [table.businessId, table.paymentBankId], foreignColumns: [paymentBanks.businessId, paymentBanks.id], name: "credit_entries_tenant_bank_fk" }).onDelete("restrict"),
  foreignKey({ columns: [table.businessId, table.recordedBy], foreignColumns: [businessMemberships.businessId, businessMemberships.userId], name: "credit_entries_membership_fk" }).onDelete("restrict"),
  uniqueIndex("credit_entries_sale_charge_uq").on(table.saleId).where(sql`${table.type} = 'SALE'`),
  index("credit_entries_customer_created_idx").on(table.customerId, table.createdAt),
  index("credit_entries_business_branch_created_idx").on(table.businessId, table.branchId, table.createdAt),
  check("credit_entries_amount_positive_ck", sql`${table.amount} > 0`),
]);

export const stockTransfers = pgTable("stock_transfers", {
  id: uuid("id").primaryKey().defaultRandom(), businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }), sourceBranchId: uuid("source_branch_id").notNull().references(() => branches.id, { onDelete: "restrict" }), destinationBranchId: uuid("destination_branch_id").notNull().references(() => branches.id, { onDelete: "restrict" }), transferNumber: text("transfer_number").notNull(), status: transferStatusEnum("status").notNull().default("DRAFT"), initiatedBy: uuid("initiated_by").notNull().references(() => users.id, { onDelete: "restrict" }), dispatchedBy: uuid("dispatched_by").references(() => users.id, { onDelete: "restrict" }), receivedBy: uuid("received_by").references(() => users.id, { onDelete: "restrict" }), notes: text("notes"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), dispatchedAt: timestamp("dispatched_at", { withTimezone: true }), receivedAt: timestamp("received_at", { withTimezone: true }),
}, (table) => [foreignKey({columns:[table.businessId,table.sourceBranchId],foreignColumns:[branches.businessId,branches.id],name:"stock_transfers_tenant_source_fk"}).onDelete("restrict"),foreignKey({columns:[table.businessId,table.destinationBranchId],foreignColumns:[branches.businessId,branches.id],name:"stock_transfers_tenant_destination_fk"}).onDelete("restrict"),foreignKey({columns:[table.businessId,table.initiatedBy],foreignColumns:[businessMemberships.businessId,businessMemberships.userId],name:"stock_transfers_initiator_membership_fk"}).onDelete("restrict"),uniqueIndex("stock_transfers_business_number_uq").on(table.businessId, table.transferNumber), index("stock_transfers_business_status_created_idx").on(table.businessId, table.status, table.createdAt), check("stock_transfers_distinct_branches_ck", sql`${table.sourceBranchId} <> ${table.destinationBranchId}`)]);

export const stockTransferItems = pgTable("stock_transfer_items", {
  id: uuid("id").primaryKey().defaultRandom(), transferId: uuid("transfer_id").notNull().references(() => stockTransfers.id, { onDelete: "restrict" }), productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "restrict" }), quantity: numeric("quantity", { precision: 14, scale: 3, mode: "number" }).notNull(),
}, (table) => [uniqueIndex("stock_transfer_items_transfer_product_uq").on(table.transferId, table.productId), check("stock_transfer_items_quantity_positive_ck", sql`${table.quantity} > 0`)]);

export const saleReversals = pgTable("sale_reversals", {
  id: uuid("id").primaryKey().defaultRandom(), businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }), branchId: uuid("branch_id").notNull().references(() => branches.id, { onDelete: "restrict" }), saleId: uuid("sale_id").notNull().references(() => sales.id, { onDelete: "restrict" }), reason: text("reason").notNull(), reversedBy: uuid("reversed_by").notNull().references(() => users.id, { onDelete: "restrict" }), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [foreignKey({columns:[table.businessId,table.branchId],foreignColumns:[branches.businessId,branches.id],name:"sale_reversals_tenant_branch_fk"}).onDelete("restrict"),foreignKey({columns:[table.businessId,table.branchId,table.saleId],foreignColumns:[sales.businessId,sales.branchId,sales.id],name:"sale_reversals_tenant_sale_fk"}).onDelete("restrict"),foreignKey({columns:[table.businessId,table.reversedBy],foreignColumns:[businessMemberships.businessId,businessMemberships.userId],name:"sale_reversals_membership_fk"}).onDelete("restrict"),uniqueIndex("sale_reversals_sale_uq").on(table.saleId), index("sale_reversals_business_created_idx").on(table.businessId, table.createdAt)]);

export type PaymentMethod = (typeof paymentMethodEnum.enumValues)[number];

/* -------------------------------------------------------------------------- */
/* Zyphr PocketShop                                                           */
/* Additive tables only. Logic tables above are not altered. Every table is    */
/* scoped by business_id and store_id so existing tenant checks remain valid.  */
/* -------------------------------------------------------------------------- */

export const psProductStatusEnum = pgEnum("ps_product_status", ["DRAFT", "ACTIVE", "ARCHIVED"]);
export const psPaymentMethodEnum = pgEnum("ps_payment_method", ["CARD", "BANK_TRANSFER", "USSD", "CASH_ON_DELIVERY"]);
export const psPaymentTimingEnum = pgEnum("ps_payment_timing", ["BEFORE_DELIVERY", "ON_DELIVERY", "PARTIAL"]);
export const psPaymentStatusEnum = pgEnum("ps_payment_status", ["PENDING", "PAID", "FAILED", "REFUNDED"]);
export const psFulfilmentStatusEnum = pgEnum("ps_fulfilment_status", ["PENDING_PAYMENT", "CONFIRMED", "PROCESSING", "READY_FOR_PICKUP", "DISPATCHED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "FAILED_DELIVERY", "REFUNDED"]);
export const psDeliveryMethodEnum = pgEnum("ps_delivery_method", ["DELIVERY", "PICKUP"]);
export const psMovementTypeEnum = pgEnum("ps_movement_type", ["ADJUSTMENT_IN", "ADJUSTMENT_OUT", "RESERVE", "RELEASE", "FULFIL", "IMPORT", "REFUND"]);

export const psStores = pgTable("ps_stores", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }),
  ownerUserId: uuid("owner_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  logoUrl: text("logo_url"),
  bannerUrl: text("banner_url"),
  category: text("category"),
  phone: text("phone"),
  email: text("email"),
  whatsapp: text("whatsapp"),
  address: text("address"),
  state: text("state"),
  city: text("city"),
  country: text("country"),
  currency: text("currency").notNull().default("NGN"),
  timezone: text("timezone").notNull().default("Africa/Lagos"),
  published: boolean("published").notNull().default(false),
  onboardingStep: integer("onboarding_step").notNull().default(1),
  openingHours: jsonb("opening_hours").notNull().default({}),
  socialLinks: jsonb("social_links").notNull().default({}),
  ...timestamps,
}, (table) => [
  uniqueIndex("ps_stores_business_uq").on(table.businessId),
  uniqueIndex("ps_stores_business_id_uq").on(table.businessId, table.id),
  uniqueIndex("ps_stores_slug_uq").on(table.slug),
  check("ps_stores_slug_ck", sql`${table.slug} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' AND char_length(${table.slug}) <= 60`),
  check("ps_stores_currency_ck", sql`char_length(${table.currency}) = 3 AND ${table.currency} = upper(${table.currency})`),
]);

export const psStoreSettings = pgTable("ps_store_settings", {
  storeId: uuid("store_id").primaryKey().references(() => psStores.id, { onDelete: "cascade" }),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }),
  paymentMethods: text("payment_methods").array().notNull().default(sql`ARRAY['CASH_ON_DELIVERY']::text[]`),
  paymentTiming: psPaymentTimingEnum("payment_timing").notNull().default("ON_DELIVERY"),
  depositPercent: integer("deposit_percent").notNull().default(0),
  deliveryEnabled: boolean("delivery_enabled").notNull().default(true),
  pickupEnabled: boolean("pickup_enabled").notNull().default(true),
  codEnabled: boolean("cod_enabled").notNull().default(true),
  notifyEmail: boolean("notify_email").notNull().default(true),
  deliveryNote: text("delivery_note"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  foreignKey({ columns: [table.businessId, table.storeId], foreignColumns: [psStores.businessId, psStores.id], name: "ps_settings_tenant_store_fk" }).onDelete("cascade"),
  check("ps_settings_deposit_ck", sql`${table.depositPercent} >= 0 AND ${table.depositPercent} <= 100`),
]);

export const psAssets = pgTable("ps_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").notNull().references(() => psStores.id, { onDelete: "restrict" }),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("ps_assets_path_uq").on(table.filePath),
  index("ps_assets_store_created_idx").on(table.storeId, table.createdAt),
  foreignKey({ columns: [table.businessId, table.storeId], foreignColumns: [psStores.businessId, psStores.id], name: "ps_assets_tenant_store_fk" }).onDelete("restrict"),
]);

export const psCategories = pgTable("ps_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").notNull().references(() => psStores.id, { onDelete: "restrict" }),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  active: boolean("active").notNull().default(true),
  ...timestamps,
}, (table) => [
  uniqueIndex("ps_categories_store_name_uq").on(table.storeId, table.name),
  uniqueIndex("ps_categories_business_id_uq").on(table.businessId, table.id),
  foreignKey({ columns: [table.businessId, table.storeId], foreignColumns: [psStores.businessId, psStores.id], name: "ps_categories_tenant_store_fk" }).onDelete("restrict"),
]);

export const psProducts = pgTable("ps_products", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").notNull().references(() => psStores.id, { onDelete: "restrict" }),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }),
  categoryId: uuid("category_id").references(() => psCategories.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  sku: text("sku").notNull(),
  description: text("description"),
  price: bigint("price", { mode: "bigint" }).notNull(),
  compareAtPrice: bigint("compare_at_price", { mode: "bigint" }),
  status: psProductStatusEnum("status").notNull().default("DRAFT"),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
  weightGrams: integer("weight_grams"),
  featured: boolean("featured").notNull().default(false),
  ...timestamps,
}, (table) => [
  uniqueIndex("ps_products_store_sku_uq").on(table.storeId, table.sku),
  uniqueIndex("ps_products_store_slug_uq").on(table.storeId, table.slug),
  uniqueIndex("ps_products_business_id_uq").on(table.businessId, table.id),
  index("ps_products_store_status_idx").on(table.storeId, table.status),
  foreignKey({ columns: [table.businessId, table.storeId], foreignColumns: [psStores.businessId, psStores.id], name: "ps_products_tenant_store_fk" }).onDelete("restrict"),
  foreignKey({ columns: [table.businessId, table.categoryId], foreignColumns: [psCategories.businessId, psCategories.id], name: "ps_products_tenant_category_fk" }).onDelete("set null"),
  check("ps_products_slug_ck", sql`${table.slug} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' AND char_length(${table.slug}) <= 80`),
  check("ps_products_prices_ck", sql`${table.price} >= 0 AND (${table.compareAtPrice} IS NULL OR ${table.compareAtPrice} >= ${table.price})`),
  check("ps_products_threshold_ck", sql`${table.lowStockThreshold} >= 0`),
]);

export const psProductImages = pgTable("ps_product_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => psProducts.id, { onDelete: "cascade" }),
  storeId: uuid("store_id").notNull().references(() => psStores.id, { onDelete: "restrict" }),
  assetId: uuid("asset_id").notNull().references(() => psAssets.id, { onDelete: "restrict" }),
  position: integer("position").notNull().default(0),
  alt: text("alt"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("ps_product_images_product_asset_uq").on(table.productId, table.assetId),
  index("ps_product_images_product_position_idx").on(table.productId, table.position),
]);

export const psVariants = pgTable("ps_variants", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => psProducts.id, { onDelete: "cascade" }),
  storeId: uuid("store_id").notNull().references(() => psStores.id, { onDelete: "restrict" }),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  value: text("value").notNull(),
  sku: text("sku").notNull(),
  price: bigint("price", { mode: "bigint" }),
  isDefault: boolean("is_default").notNull().default(false),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("ps_variants_product_sku_uq").on(table.productId, table.sku),
  index("ps_variants_product_idx").on(table.productId),
  foreignKey({ columns: [table.businessId, table.storeId], foreignColumns: [psStores.businessId, psStores.id], name: "ps_variants_tenant_store_fk" }).onDelete("restrict"),
  check("ps_variants_price_ck", sql`${table.price} IS NULL OR ${table.price} >= 0`),
]);

export const psInventory = pgTable("ps_inventory", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").notNull().references(() => psStores.id, { onDelete: "restrict" }),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }),
  productId: uuid("product_id").notNull().references(() => psProducts.id, { onDelete: "restrict" }),
  variantId: uuid("variant_id").notNull().references(() => psVariants.id, { onDelete: "restrict" }),
  quantityOnHand: integer("quantity_on_hand").notNull().default(0),
  reserved: integer("reserved").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("ps_inventory_variant_uq").on(table.variantId),
  index("ps_inventory_store_idx").on(table.storeId),
  foreignKey({ columns: [table.businessId, table.storeId], foreignColumns: [psStores.businessId, psStores.id], name: "ps_inventory_tenant_store_fk" }).onDelete("restrict"),
  foreignKey({ columns: [table.businessId, table.productId], foreignColumns: [psProducts.businessId, psProducts.id], name: "ps_inventory_tenant_product_fk" }).onDelete("restrict"),
  check("ps_inventory_nonnegative_ck", sql`${table.quantityOnHand} >= 0 AND ${table.reserved} >= 0`),
]);

export const psInventoryMovements = pgTable("ps_inventory_movements", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").notNull().references(() => psStores.id, { onDelete: "restrict" }),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }),
  productId: uuid("product_id").notNull().references(() => psProducts.id, { onDelete: "restrict" }),
  variantId: uuid("variant_id").notNull().references(() => psVariants.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
  quantityBefore: integer("quantity_before").notNull(),
  quantityAfter: integer("quantity_after").notNull(),
  movementType: psMovementTypeEnum("movement_type").notNull(),
  referenceType: text("reference_type").notNull(),
  referenceId: uuid("reference_id"),
  actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("ps_inventory_movements_variant_created_idx").on(table.variantId, table.createdAt),
  index("ps_inventory_movements_store_created_idx").on(table.storeId, table.createdAt),
  foreignKey({ columns: [table.businessId, table.storeId], foreignColumns: [psStores.businessId, psStores.id], name: "ps_movements_tenant_store_fk" }).onDelete("restrict"),
  check("ps_inventory_movements_quantity_ck", sql`${table.quantity} <> 0 AND ${table.quantityAfter} = ${table.quantityBefore} + ${table.quantity} AND ${table.quantityAfter} >= 0`),
]);

export const psCarts = pgTable("ps_carts", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").notNull().references(() => psStores.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("ps_carts_store_token_uq").on(table.storeId, table.token)]);

export const psCartItems = pgTable("ps_cart_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  cartId: uuid("cart_id").notNull().references(() => psCarts.id, { onDelete: "cascade" }),
  variantId: uuid("variant_id").notNull().references(() => psVariants.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("ps_cart_items_cart_variant_uq").on(table.cartId, table.variantId),
  check("ps_cart_items_quantity_ck", sql`${table.quantity} > 0 AND ${table.quantity} <= 999`),
]);

export const psCustomers = pgTable("ps_customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").notNull().references(() => psStores.id, { onDelete: "restrict" }),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("ps_customers_store_phone_uq").on(table.storeId, table.phone),
  uniqueIndex("ps_customers_business_id_uq").on(table.businessId, table.id),
  index("ps_customers_store_name_idx").on(table.storeId, table.name),
  foreignKey({ columns: [table.businessId, table.storeId], foreignColumns: [psStores.businessId, psStores.id], name: "ps_customers_tenant_store_fk" }).onDelete("restrict"),
]);

export const psDeliveryZones = pgTable("ps_delivery_zones", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").notNull().references(() => psStores.id, { onDelete: "restrict" }),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  description: text("description"),
  fee: bigint("fee", { mode: "bigint" }).notNull().default(sql`0`),
  estimatedDays: text("estimated_days"),
  active: boolean("active").notNull().default(true),
  ...timestamps,
}, (table) => [
  uniqueIndex("ps_delivery_zones_store_name_uq").on(table.storeId, table.name),
  foreignKey({ columns: [table.businessId, table.storeId], foreignColumns: [psStores.businessId, psStores.id], name: "ps_zones_tenant_store_fk" }).onDelete("restrict"),
  check("ps_delivery_zones_fee_ck", sql`${table.fee} >= 0`),
]);

export const psOrders = pgTable("ps_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").notNull().references(() => psStores.id, { onDelete: "restrict" }),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }),
  reference: text("reference").notNull(),
  customerId: uuid("customer_id").references(() => psCustomers.id, { onDelete: "set null" }),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerEmail: text("customer_email"),
  deliveryMethod: psDeliveryMethodEnum("delivery_method").notNull(),
  deliveryZoneId: uuid("delivery_zone_id").references(() => psDeliveryZones.id, { onDelete: "set null" }),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  deliveryInstructions: text("delivery_instructions"),
  subtotal: bigint("subtotal", { mode: "bigint" }).notNull(),
  deliveryFee: bigint("delivery_fee", { mode: "bigint" }).notNull().default(sql`0`),
  discount: bigint("discount", { mode: "bigint" }).notNull().default(sql`0`),
  total: bigint("total", { mode: "bigint" }).notNull(),
  depositAmount: bigint("deposit_amount", { mode: "bigint" }).notNull().default(sql`0`),
  currency: text("currency").notNull(),
  paymentMethod: psPaymentMethodEnum("payment_method").notNull(),
  paymentTiming: psPaymentTimingEnum("payment_timing").notNull(),
  paymentStatus: psPaymentStatusEnum("payment_status").notNull().default("PENDING"),
  fulfilmentStatus: psFulfilmentStatusEnum("fulfilment_status").notNull().default("PENDING_PAYMENT"),
  trackingRef: text("tracking_ref"),
  internalNotes: text("internal_notes"),
  accessTokenHash: text("access_token_hash").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  reservedUntil: timestamp("reserved_until", { withTimezone: true }).notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  uniqueIndex("ps_orders_reference_uq").on(table.reference),
  uniqueIndex("ps_orders_access_token_uq").on(table.accessTokenHash),
  uniqueIndex("ps_orders_idempotency_uq").on(table.storeId, table.idempotencyKey),
  index("ps_orders_store_created_idx").on(table.storeId, table.createdAt),
  index("ps_orders_store_status_idx").on(table.storeId, table.fulfilmentStatus),
  foreignKey({ columns: [table.businessId, table.storeId], foreignColumns: [psStores.businessId, psStores.id], name: "ps_orders_tenant_store_fk" }).onDelete("restrict"),
  foreignKey({ columns: [table.businessId, table.customerId], foreignColumns: [psCustomers.businessId, psCustomers.id], name: "ps_orders_tenant_customer_fk" }).onDelete("set null"),
  check("ps_orders_totals_ck", sql`${table.subtotal} >= 0 AND ${table.deliveryFee} >= 0 AND ${table.discount} >= 0 AND ${table.total} = ${table.subtotal} + ${table.deliveryFee} - ${table.discount} AND ${table.total} >= 0`),
]);

export const psOrderItems = pgTable("ps_order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => psOrders.id, { onDelete: "restrict" }),
  productId: uuid("product_id").notNull().references(() => psProducts.id, { onDelete: "restrict" }),
  variantId: uuid("variant_id").notNull().references(() => psVariants.id, { onDelete: "restrict" }),
  productName: text("product_name").notNull(),
  variantName: text("variant_name").notNull(),
  sku: text("sku").notNull(),
  imageUrl: text("image_url"),
  quantity: integer("quantity").notNull(),
  unitPrice: bigint("unit_price", { mode: "bigint" }).notNull(),
  lineTotal: bigint("line_total", { mode: "bigint" }).notNull(),
}, (table) => [
  index("ps_order_items_order_idx").on(table.orderId),
  check("ps_order_items_values_ck", sql`${table.quantity} > 0 AND ${table.unitPrice} >= 0 AND ${table.lineTotal} = ${table.quantity} * ${table.unitPrice}`),
]);

export const psOrderEvents = pgTable("ps_order_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => psOrders.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  message: text("message").notNull(),
  actor: text("actor").notNull(),
  actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("ps_order_events_order_created_idx").on(table.orderId, table.createdAt)]);

export const psPayments = pgTable("ps_payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => psOrders.id, { onDelete: "restrict" }),
  storeId: uuid("store_id").notNull().references(() => psStores.id, { onDelete: "restrict" }),
  provider: text("provider").notNull(),
  method: psPaymentMethodEnum("method").notNull(),
  providerReference: text("provider_reference"),
  amount: bigint("amount", { mode: "bigint" }).notNull(),
  currency: text("currency").notNull(),
  status: psPaymentStatusEnum("status").notNull().default("PENDING"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("ps_payments_provider_reference_uq").on(table.provider, table.providerReference).where(sql`${table.providerReference} IS NOT NULL`),
  index("ps_payments_order_idx").on(table.orderId),
  check("ps_payments_amount_ck", sql`${table.amount} >= 0`),
]);

export const psRateLimits = pgTable("ps_rate_limits", {
  key: text("key").primaryKey(),
  attempts: integer("attempts").notNull().default(0),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull().defaultNow(),
});

export const psConnectedAccounts = pgTable("ps_connected_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").notNull().references(() => psStores.id, { onDelete: "restrict" }),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }),
  provider: text("provider").notNull(),
  externalAccountId: text("external_account_id").notNull(),
  status: text("status").notNull().default("PENDING"),
  scopes: text("scopes").array(),
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  uniqueIndex("ps_connected_accounts_store_provider_uq").on(table.storeId, table.provider, table.externalAccountId),
  foreignKey({ columns: [table.businessId, table.storeId], foreignColumns: [psStores.businessId, psStores.id], name: "ps_connected_tenant_store_fk" }).onDelete("restrict"),
]);

/**
 * Channel records are deliberately independent of credentials. Official OAuth
 * tokens stay in a secret store; only a non-secret credential reference is kept
 * here. A channel is never shown as connected until a provider callback has
 * written an AUTHORIZED status through an official API adapter.
 */
export const psChannels = pgTable("ps_channels", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").notNull().references(() => psStores.id, { onDelete: "restrict" }),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }),
  provider: text("provider").notNull(),
  displayName: text("display_name").notNull(),
  externalId: text("external_id"),
  authorizationStatus: text("authorization_status").notNull().default("NOT_CONNECTED"),
  permissions: text("permissions").array().notNull().default(sql`ARRAY[]::text[]`),
  credentialRef: text("credential_ref"),
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  uniqueIndex("ps_channels_store_provider_external_uq").on(table.storeId, table.provider, table.externalId),
  foreignKey({ columns: [table.businessId, table.storeId], foreignColumns: [psStores.businessId, psStores.id], name: "ps_channels_tenant_store_fk" }).onDelete("restrict"),
]);

export const psConversations = pgTable("ps_conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").notNull().references(() => psStores.id, { onDelete: "restrict" }),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }),
  channelId: uuid("channel_id").references(() => psChannels.id, { onDelete: "set null" }),
  customerId: uuid("customer_id").references(() => psCustomers.id, { onDelete: "set null" }),
  externalThreadId: text("external_thread_id"),
  subject: text("subject"),
  status: text("status").notNull().default("OPEN"),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("ps_conversations_channel_thread_uq").on(table.channelId, table.externalThreadId).where(sql`${table.externalThreadId} IS NOT NULL`),
  index("ps_conversations_store_updated_idx").on(table.storeId, table.lastMessageAt),
  foreignKey({ columns: [table.businessId, table.storeId], foreignColumns: [psStores.businessId, psStores.id], name: "ps_conversations_tenant_store_fk" }).onDelete("restrict"),
]);

export const psMessages = pgTable("ps_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull().references(() => psConversations.id, { onDelete: "cascade" }),
  storeId: uuid("store_id").notNull().references(() => psStores.id, { onDelete: "restrict" }),
  direction: text("direction").notNull(),
  body: text("body").notNull(),
  externalMessageId: text("external_message_id"),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("ps_messages_external_uq").on(table.storeId, table.externalMessageId).where(sql`${table.externalMessageId} IS NOT NULL`),
  index("ps_messages_conversation_sent_idx").on(table.conversationId, table.sentAt),
  check("ps_messages_direction_ck", sql`${table.direction} IN ('INBOUND','OUTBOUND')`),
]);
