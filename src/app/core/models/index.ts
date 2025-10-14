export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: 'SUPER_ADMIN' | 'OPERATOR';
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: User;
}

export interface Customer {
  id?: number;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  address?: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MonthlyPayment {
  id: number;
  dueDate: Date;
  expectedAmount: string;
  paidAmount: string;
  interestPaid: string;
  capitalPaid: string;
  isPaid: boolean;
  paymentDate?: Date;
}

export interface Loan {
  id?: number;
  customer?: Customer;
  customerId?: number;
  loanDate: Date | string;
  amount: string;
  currentBalance?: string;
  totalInterestPaid?: string;
  totalCapitalPaid?: string;
  totalExtraChargesPaid?: number;
  monthlyInterestRate?: string;
  term?: number; // Plazo en quincenas
  modality?: 'meses' | 'quincenas'; // Add this line
  loanType: 'Cápsula' | 'Indefinido';
  status?: 'ACTIVE' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  notes?: string;
  monthsPaid?: number;
  lastPaymentDate?: Date;
  payments?: Payment[];
  monthlyPayments?: MonthlyPayment[];
  createdAt?: Date;
  updatedAt?: Date;
  overduePeriodsCount?: number;
  overduePeriodsUnit?: string;
  accumulatedOverdueAmount?: number;
}

export interface Payment {
  id?: number;
  loan?: Loan;
  loanId?: number;
  paymentDate: Date | string;
  amount: string;
  paymentType?: 'CAPITAL' | 'INTEREST' | 'BOTH';
  paymentMethod?: string;
  receiptNumber?: string;
  notes?: string;
  interestPaid?: string;
  capitalPaid?: string;
  lateInterest?: number;
  newBalance?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DashboardSummary {
  totalLoaned: number;
  capitalRecovered: number;
  interestCollected: number;
  extraChargesCollected: number;
  capitalInTransit: number;
  monthlyInterest: number;
  overdueCount: number;
  overdueAmount: number;
  activeLoans: number;
  totalLoans: number;
}