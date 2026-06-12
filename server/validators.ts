import { z } from 'zod';

export const PAYMENT_STATUSES = ['pending', 'paid', 'partial', 'overdue', 'cancelled'] as const;
export const COMPANY_STATUSES = ['active', 'inactive'] as const;
export const SUBSCRIPTION_STATUSES = ['active', 'cancelled', 'expired'] as const;
export const RENEWAL_CYCLES = ['monthly', 'quarterly', 'yearly', 'weekly', 'custom'] as const;
export const QUOTATION_STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'converted'] as const;
export const INVOICE_STATUSES = ['pending', 'paid', 'partial', 'overdue', 'cancelled'] as const;
export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const;
export const TASK_STATUSES = ['pending', 'in_progress', 'completed'] as const;
export const CONTRACT_STATUSES = ['active', 'expired', 'cancelled'] as const;
export const EXPENSE_CATEGORIES = [
  'hosting', 'software', 'fuel', 'internet', 'electricity', 'marketing',
  'salary', 'office', 'travel', 'meals', 'taxes', 'miscellaneous',
] as const;
export const RECURRENCE_CYCLES = ['weekly', 'monthly', 'quarterly', 'yearly'] as const;

const optionalString = z.string().trim().max(2000).optional().transform((v) => (v && v.length > 0 ? v : undefined));
const isoDate = z.string().min(1).refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid date');

export const CURRENCIES = ['LKR', 'USD'] as const;
const currencyField = z.enum(CURRENCIES).default('LKR');

export const CompanyCreateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  contactPerson: optionalString,
  email: optionalString,
  phone: optionalString,
  address: optionalString,
  website: optionalString,
  notes: optionalString,
  services: optionalString,
  monthlyAmount: z.coerce.number().nonnegative().default(0),
  status: z.enum(COMPANY_STATUSES).default('active'),
});
export const CompanyUpdateSchema = CompanyCreateSchema.partial();

export const PaymentCreateSchema = z.object({
  companyId: z.string().min(1, 'Company is required'),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  amountPaid: z.coerce.number().nonnegative().default(0),
  currency: currencyField,
  dueDate: isoDate,
  datePaid: isoDate.optional(),
  invoiceNumber: optionalString,
  service: optionalString,
  method: optionalString,
  status: z.enum(PAYMENT_STATUSES).default('pending'),
  notes: optionalString,
  recurring: z.coerce.boolean().default(false),
  recurrenceCycle: z.enum(RECURRENCE_CYCLES).optional(),
});
export const PaymentUpdateSchema = PaymentCreateSchema.partial();

export const SubscriptionCreateSchema = z.object({
  provider: z.string().trim().min(1, 'Provider is required').max(200),
  cost: z.coerce.number().nonnegative().default(0),
  currency: currencyField,
  purchaseDate: isoDate.optional(),
  expiryDate: isoDate,
  renewalCycle: z.enum(RENEWAL_CYCLES).default('monthly'),
  reminderDays: z.coerce.number().int().min(0).max(365).default(7),
  autoRenew: z.coerce.boolean().default(false),
  status: z.enum(SUBSCRIPTION_STATUSES).default('active'),
  email: optionalString,
  notes: optionalString,
});
export const SubscriptionUpdateSchema = SubscriptionCreateSchema.partial();

const LineItemSchema = z.object({
  description: z.string().trim().min(1, 'Description is required').max(500),
  quantity: z.coerce.number().nonnegative().default(1),
  unitPrice: z.coerce.number().default(0),
  position: z.coerce.number().int().nonnegative().default(0),
});

export const QuotationCreateSchema = z.object({
  date: isoDate.optional(),
  validUntil: isoDate.optional(),
  companyId: z.string().optional().nullable(),
  customerName: z.string().trim().min(1, 'Customer name is required').max(200),
  customerEmail: optionalString,
  customerAddress: optionalString,
  notes: optionalString,
  currency: currencyField,
  discountPercent: z.coerce.number().min(0).max(100).default(0),
  taxPercent: z.coerce.number().min(0).max(100).default(0),
  status: z.enum(QUOTATION_STATUSES).default('draft'),
  isTemplate: z.coerce.boolean().default(false),
  templateName: optionalString,
  items: z.array(LineItemSchema).default([]),
});
export const QuotationUpdateSchema = QuotationCreateSchema.partial();

export const InvoiceCreateSchema = z.object({
  date: isoDate.optional(),
  dueDate: isoDate,
  companyId: z.string().optional().nullable(),
  customerName: z.string().trim().min(1, 'Customer name is required').max(200),
  customerEmail: optionalString,
  customerAddress: optionalString,
  notes: optionalString,
  currency: currencyField,
  discountPercent: z.coerce.number().min(0).max(100).default(0),
  taxPercent: z.coerce.number().min(0).max(100).default(0),
  amountPaid: z.coerce.number().nonnegative().default(0),
  status: z.enum(INVOICE_STATUSES).default('pending'),
  items: z.array(LineItemSchema).default([]),
});
export const InvoiceUpdateSchema = InvoiceCreateSchema.partial();

export const ExpenseCreateSchema = z.object({
  date: isoDate.optional(),
  category: z.string().trim().min(1).max(100),
  amount: z.coerce.number().nonnegative(),
  currency: currencyField,
  description: optionalString,
  vendor: optionalString,
  notes: optionalString,
});
export const ExpenseUpdateSchema = ExpenseCreateSchema.partial();

export const ContractCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  partyName: optionalString,
  startDate: isoDate.optional(),
  expiryDate: isoDate.optional(),
  renewalDate: isoDate.optional(),
  fileUrl: optionalString,
  notes: optionalString,
  status: z.enum(CONTRACT_STATUSES).default('active'),
});
export const ContractUpdateSchema = ContractCreateSchema.partial();

export const TaskCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: optionalString,
  priority: z.enum(TASK_PRIORITIES).default('medium'),
  status: z.enum(TASK_STATUSES).default('pending'),
  dueDate: isoDate.optional(),
});
export const TaskUpdateSchema = TaskCreateSchema.partial();

export const SettingsUpdateSchema = z.object({
  businessName: z.string().trim().min(1).max(200).optional(),
  businessEmail: optionalString,
  businessPhone: optionalString,
  businessAddress: optionalString,
  defaultCurrency: z.string().trim().min(1).max(8).optional(),
  taxPercent: z.coerce.number().min(0).max(100).optional(),
  emailServiceId: optionalString,
  emailPaymentTemplateId: optionalString,
  emailSubscriptionTemplateId: optionalString,
  emailPublicKey: optionalString,
  emailPrivateKey: optionalString,
});
