export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  isActive: boolean;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  id: string;
  module: string;
  action: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  company?: string;
  jobTitle?: string;
  source?: string;
  status: 'Open' | 'Qualified' | 'Disqualified' | 'Converted';
  score: number;
  value: number;
  expectedCloseDate?: Date;
  productId?: string;
  productName?: string;
  lostReason?: string;
  owner: User;
  account?: Account;
  tags?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Account {
  id: string;
  name: string;
  industry?: string;
  size?: string;
  website?: string;
  phoneNumber?: string;
  type: 'Prospect' | 'Customer' | 'Inactive';
  status: 'Prospect' | 'Customer' | 'Inactive';
  owner: User;
  contacts: Contact[];
  opportunities: Opportunity[];
  tags?: string;
  onboardingStatus?: 'Not Started' | 'In Progress' | 'Completed' | 'On Hold';
  onboardingDate?: Date;
  onboardingCompletedDate?: Date;
  onboardingNotes?: string;
  contractSignedDate?: Date;
  goLiveDate?: Date;
  accountManager?: string;
  billingContact?: string;
  technicalContact?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  jobTitle?: string;
  role?: string;
  isPrimary: boolean;
  account: Account;
  linkedinUrl?: string;
  birthday?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Opportunity {
  id: string;
  name: string;
  amount: number;
  stage:
    | 'Prospecting'
    | 'Qualification'
    | 'Proposal'
    | 'Negotiation'
    | 'Closed-Won'
    | 'Closed-Lost';
  status: 'Open' | 'Won' | 'Lost';
  description?: string;
  forecastedCloseDate: Date;
  probability: number;
  account: Account;
  primaryContact?: Contact;
  owner: User;
  lineItems: LineItem[];
  tags?: string;
  closedAt?: Date;
  closedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LineItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountPercent?: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Activity {
  id: string;
  type: 'Call' | 'Email' | 'Meeting' | 'Task' | 'Note' | 'System';
  title: string;
  description?: string;
  resourceType: 'Lead' | 'Account' | 'Contact' | 'Opportunity';
  resourceId: string;
  createdBy: User;
  dueDate?: Date;
  isCompleted: boolean;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Note {
  id: string;
  content: string;
  resourceType: 'Lead' | 'Account' | 'Contact' | 'Opportunity';
  resourceId: string;
  createdBy: User;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface Contract {
  id: string;
  contractNumber: string;
  title: string;
  type: string;
  value: number;
  startDate: Date;
  endDate: Date;
  renewalDate?: Date;
  paymentTerms?: string;
  slaTerms?: string;
  status: 'Draft' | 'Sent for Approval' | 'Approved' | 'Active' | 'Expired' | 'Terminated';
  account: Account;
  opportunity?: Opportunity;
  projects?: Project[];
  invoices?: Invoice[];
  createdBy: User;
  approvedBy?: User;
  approvedDate?: Date;
  documentPath?: string;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  projectName: string;
  status: 'Planning' | 'In Progress' | 'UAT' | 'Deployed' | 'On Hold' | 'Closed';
  startDate: Date;
  endDate?: Date;
  goLiveDate?: Date;
  budget: number;
  revenue: number;
  progressPercent: number;
  isLoaded?: boolean;
  loadedDate?: Date;
  loadedBy?: string;
  demoConducted?: boolean;
  demoDate?: Date;
  conductedBy?: string;
  clientDemoApproval?: boolean;
  uatStatus: 'Pending' | 'In Progress' | 'Approved' | 'Rejected';
  uatStartDate?: Date;
  uatCompletedDate?: Date;
  uatSignoffBy?: string;
  uatRemarks?: string;
  prodDeploymentStatus: 'Not Started' | 'Scheduled' | 'Deployed' | 'Rolled Back';
  prodDeploymentDate?: Date;
  prodDeploymentBy?: string;
  goLiveApproval?: boolean;
  projectClosureSigned?: boolean;
  projectClosureSignDate?: Date;
  projectClosureSignedBy?: string;
  closureRemarks?: string;
  account: Account;
  contract: Contract;
  projectManager: User;
  milestones: ProjectMilestone[];
  invoices?: Invoice[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectMilestone {
  id: string;
  milestoneType: string;
  milestoneName: string;
  completedDate?: Date;
  completedTime?: string;
  responsibleUser?: User;
  remarks?: string;
  approvalStatus: 'Pending' | 'Approved' | 'Rejected';
  approvedBy?: User;
  approvedDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  tax?: number;
  totalAmount: number;
  invoiceDate: Date;
  dueDate: Date;
  billingCycle?: 'Monthly' | 'Quarterly' | 'Semi-Annual' | 'Annual' | 'Milestone-Based';
  status: 'Draft' | 'Sent' | 'Partially Paid' | 'Paid' | 'Overdue' | 'Cancelled';
  description?: string;
  notes?: string;
  documentPath?: string;
  contract: Contract;
  project?: Project;
  account: Account;
  payments: Payment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: 'Bank Transfer' | 'Check' | 'Credit Card' | 'Wire Transfer' | 'Cash' | 'Other';
  transactionReference?: string;
  remarks?: string;
  invoice: Invoice;
  createdAt: Date;
  updatedAt: Date;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Open' | 'In Progress' | 'Pending Customer' | 'Resolved' | 'Closed';
  category?: string;
  source?: string;
  account: Account;
  contact?: Contact;
  reporter: User;
  assignee?: User;
  slaResponseHours?: number;
  slaResolutionHours?: number;
  responseDeadline?: Date;
  resolutionDeadline?: Date;
  respondedAt?: Date;
  resolvedAt?: Date;
  resolutionNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  oldValues?: Record<string, any>;
  newValues: Record<string, any>;
  user: User;
  ipAddress?: string;
  userAgent?: string;
  description?: string;
  createdAt: Date;
}

export interface Notification {
  id: string;
  type: 'ContractExpiry' | 'InvoiceDue' | 'UATApproval' | 'PaymentReminder' | 'ProjectMilestone' | 'TicketUpdate';
  title: string;
  message: string;
  recipient: User;
  relatedEntityType?: string;
  relatedEntityId?: string;
  relatedEntityName?: string;
  isRead: boolean;
  readAt?: Date;
  actionUrl?: string;
  actionLabel?: string;
  createdAt: Date;
  updatedAt: Date;
}
