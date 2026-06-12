export type Company = {
  id: string;
  name: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  website?: string | null;
  notes?: string | null;
  services?: string | null;
  monthlyAmount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type CompanyListItem = Company & { outstanding: number; paymentCount: number };

export type Payment = {
  id: string;
  companyId: string;
  amount: number;
  amountPaid: number;
  currency: string;
  fxRate: number;
  dueDate: string;
  datePaid?: string | null;
  invoiceNumber?: string | null;
  service?: string | null;
  method?: string | null;
  status: string;
  notes?: string | null;
  recurring: boolean;
  recurrenceCycle?: string | null;
  parentPaymentId?: string | null;
  createdAt: string;
  updatedAt: string;
  company?: { id: string; name: string };
};

export type Subscription = {
  id: string;
  provider: string;
  cost: number;
  currency: string;
  fxRate: number;
  purchaseDate?: string | null;
  expiryDate: string;
  renewalCycle: string;
  reminderDays: number;
  autoRenew: boolean;
  status: string;
  email?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Reminder = {
  id: string;
  type: string;
  status: string;
  email: string | null;
  detail: string | null;
  sentAt: string;
  target: string | null;
};

export type LineItem = { id?: string; description: string; quantity: number; unitPrice: number; position?: number };

export type Quotation = {
  id: string;
  number: string;
  date: string;
  validUntil?: string | null;
  companyId?: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerAddress?: string | null;
  notes?: string | null;
  currency: string;
  fxRate: number;
  discountPercent: number;
  taxPercent: number;
  status: string;
  isTemplate: boolean;
  templateName?: string | null;
  items: LineItem[];
  company?: { id: string; name: string } | null;
  invoice?: { id: string; number: string } | null;
  createdAt: string;
  updatedAt: string;
};

export type Invoice = {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  companyId?: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerAddress?: string | null;
  notes?: string | null;
  currency: string;
  fxRate: number;
  discountPercent: number;
  taxPercent: number;
  amountPaid: number;
  status: string;
  quotationId?: string | null;
  items: LineItem[];
  company?: { id: string; name: string } | null;
  quotation?: { id: string; number: string } | null;
  createdAt: string;
  updatedAt: string;
};

export type Expense = {
  id: string;
  date: string;
  category: string;
  amount: number;
  currency: string;
  fxRate: number;
  description?: string | null;
  vendor?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Contract = {
  id: string;
  name: string;
  partyName?: string | null;
  startDate?: string | null;
  expiryDate?: string | null;
  renewalDate?: string | null;
  fileUrl?: string | null;
  notes?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type Task = {
  id: string;
  title: string;
  description?: string | null;
  priority: string;
  status: string;
  dueDate?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Settings = {
  businessName: string;
  businessEmail?: string | null;
  businessPhone?: string | null;
  businessAddress?: string | null;
  defaultCurrency: string;
  taxPercent: number;
  emailServiceId?: string | null;
  emailPaymentTemplateId?: string | null;
  emailSubscriptionTemplateId?: string | null;
  emailPublicKey?: string | null;
  emailPrivateKey?: string | null;
};

export type CalendarEvent = {
  id: string;
  kind: 'payment' | 'subscription' | 'contract' | 'task' | 'invoice';
  date: string;
  title: string;
  status: string;
};

export type ReportsSummary = {
  months: number;
  series: { month: string; revenue: number; expenses: number; profit: number; invoiceTotal: number }[];
  totals: { revenue: number; expenses: number; profit: number; invoiceTotal: number };
  expensesByCategory: { category: string; amount: number }[];
};

export type DashboardStats = {
  totalCompanies: number;
  totalRevenue: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  profit: number;
  activeSubscriptions: number;
  expiringSubscriptions: number;
  pendingPayments: number;
  overduePayments: number;
  pendingQuotations: number;
  pendingTasks: number;
};

export type DashboardAlerts = {
  upcomingPayments: { id: string; companyName: string; amount: number; dueDate: string; invoiceNumber: string | null; service: string | null }[];
  upcomingSubscriptions: { id: string; provider: string; cost: number; currency: string; expiryDate: string }[];
  upcomingInvoices: { id: string; number: string; customerName: string; balance: number; dueDate: string }[];
  recentReminders: Reminder[];
};
