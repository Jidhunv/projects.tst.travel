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
