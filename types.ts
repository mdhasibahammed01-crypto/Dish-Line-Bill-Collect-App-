export enum ConnectionStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
  PAUSED = 'Paused',
}

export enum PaymentStatus {
  PAID = 'Paid',
  DUE = 'Due',
  ADVANCE = 'Advance',
}

export enum BillStatus {
  PAID = 'Paid',
  UNPAID = 'Unpaid',
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  area: string;
  monthlyBill: number;
  connectionStatus: ConnectionStatus;
  startDate: string; // ISO string date
  openingDue: number; // For separate, long-term due.
  reactivationDate?: string; // Optional: For paused customers
}

export interface Payment {
  id: string;
  customerId: string;
  amount: number;
  date: string; // ISO string date
  notes?: string;
}

export interface Bill {
  id:string;
  customerId: string;
  amount: number;
  month: number; // 1-12
  year: number;
  status: BillStatus;
  dueDate: string; // ISO string date
  paidDate?: string; // ISO string date
  paymentId?: string;
  paidAmount?: number;
}


export interface DuePayment {
  id: string;
  customerId: string;
  amount: number;
  date: string; // ISO string date
  notes?: string;
}

export interface Area {
  id: string;
  name: string;
}

export interface User {
  id: string;
  fullName: string;
  emailOrPhone: string;
  companyName: string;
  profilePicture?: string;
  area?: string;
  subscriptionStatus: 'free_trial' | 'pending' | 'active';
  trialEndDate: string; // ISO string date
  subscriptionRequest?: {
    senderPhone: string;
    transactionId: string;
    requestDate: string; // ISO string date
  };
}

export interface SubscriptionRequest {
  id?: string;
  userId: string;
  userEmail: string;
  senderPhone: string;
  transactionId: string;
  requestDate: string; // ISO string date
  status: 'pending' | 'verified' | 'rejected';
}

export type Language = 'en' | 'bn';
export type Theme = 'light' | 'dark';