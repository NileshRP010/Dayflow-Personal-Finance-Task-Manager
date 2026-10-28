import { ArrowDownLeft, ArrowRight, Coffee, CreditCard, Landmark, ShoppingBag } from 'lucide-react';

// Clearly labeled local preview data. Backend phases will replace these records.
export const demoTransactions = [
  { id: 1, name: 'Freelance payment', category: 'Income', date: 'Oct 14', isoDate: '2026-10-14', amount: 4500, kind: 'income', icon: ArrowDownLeft },
  { id: 2, name: 'Cafe Coffee Day', category: 'Food & drink', date: 'Oct 16', isoDate: '2026-10-16', amount: 280, kind: 'expense', icon: Coffee },
  { id: 3, name: 'Metro card recharge', category: 'Transport', date: 'Oct 15', isoDate: '2026-10-15', amount: 500, kind: 'expense', icon: ArrowRight },
  { id: 4, name: 'Phone plan', category: 'Subscriptions', date: 'Oct 12', isoDate: '2026-10-12', amount: 799, kind: 'expense', icon: CreditCard },
  { id: 5, name: 'Groceries', category: 'Home', date: 'Oct 11', isoDate: '2026-10-11', amount: 1240, kind: 'expense', icon: ShoppingBag },
  { id: 6, name: 'Scholarship', category: 'Education', date: 'Oct 10', isoDate: '2026-10-10', amount: 12000, kind: 'income', icon: Landmark },
];

export const demoTasks = [
  { id: 1, title: 'Buy groceries', category: 'Personal', due: 'Today · 5:30 PM', done: false, color: 'sage' },
  { id: 2, title: 'Submit assignment', category: 'Personal', due: 'Today · 11:59 PM', done: false, color: 'lilac' },
  { id: 3, title: 'Pay electricity bill', category: 'Money', due: 'Oct 20 · ₹1,840', done: false, color: 'peach' },
  { id: 4, title: 'Review subscriptions', category: 'Money', due: 'Oct 22 · 4 renewals', done: false, color: 'blue' },
  { id: 5, title: 'Transfer to laptop goal', category: 'Money', due: 'Oct 25 · ₹2,000', done: false, color: 'sage' },
  { id: 6, title: 'Mark rent paid', category: 'Money', due: 'Oct 1', done: true, color: 'peach' },
  { id: 7, title: 'Book dentist', category: 'Personal', due: 'Oct 12', done: true, color: 'lilac' },
];

export const spendingHistory = [
  { month: 'May', amount: 17800 }, { month: 'Jun', amount: 22200 },
  { month: 'Jul', amount: 15800 }, { month: 'Aug', amount: 26400 },
  { month: 'Sep', amount: 19600 }, { month: 'Oct', amount: 18420 },
];

export const demoBudgets = [
  { id: 1, category: 'Food & drink', spent: 6240, limit: 8000, monthStart: '2026-10-01' },
  { id: 2, category: 'Transport', spent: 2100, limit: 4000, monthStart: '2026-10-01' },
  { id: 3, category: 'Shopping', spent: 4600, limit: 5000, monthStart: '2026-10-01' },
  { id: 4, category: 'Subscriptions', spent: 1590, limit: 2500, monthStart: '2026-10-01' },
  { id: 5, category: 'Everything else', spent: 3890, limit: 10500, monthStart: '2026-10-01' },
];

export const demoGoals = [
  { id: 1, emoji: '💻', title: 'A laptop that lasts', savedAmount: 32000, targetAmount: 50000, targetDate: '2026-12-01' },
  { id: 2, emoji: '🌱', title: 'A softer landing', savedAmount: 18000, targetAmount: 40000, targetDate: '2027-03-01' },
];

export const demoSubscriptions = [
  { id: 1, name: 'Phone plan', category: 'Subscriptions', amount: 799, billingCycle: 'monthly', nextDueDate: '2026-10-26', active: true },
  { id: 2, name: 'Internet', category: 'Home', amount: 999, billingCycle: 'monthly', nextDueDate: '2026-10-28', active: true },
  { id: 3, name: 'Music', category: 'Subscriptions', amount: 149, billingCycle: 'monthly', nextDueDate: '2026-11-03', active: true },
];
