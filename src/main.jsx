import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import {
  ArrowDownLeft, ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, Bell,
  Check, CheckCheck, ChevronDown, CircleHelp, Coffee, CreditCard, Ellipsis, Eye,
  EyeOff,
  Download, FileText, Filter, Flame, Goal, Home, Landmark, Menu, Pencil, Plus, Search, Settings,
  ShoppingBag, Sparkles, TrendingUp, Trash2, Wallet, X, Zap,
} from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis,
} from 'recharts';
import { demoBudgets, demoGoals, demoSubscriptions, demoTasks, demoTransactions, spendingHistory } from './demo/sampleData';
import './style.css';

const navItems = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'transactions', label: 'Transactions', icon: ArrowDownRight },
  { id: 'tasks', label: 'Personal tasks', icon: CheckCheck },
  { id: 'budgets', label: 'Budgets & goals', icon: Goal },
];

const money = (value) => `₹${Math.abs(value).toLocaleString('en-IN')}`;
const transactionIcon = (kind) => kind === 'income' ? ArrowDownLeft : ShoppingBag;
const formatDate = (value) => value ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' }).format(new Date(`${value}T00:00:00`)) : 'Today';
const localISODate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const monthKey = (date) => date?.slice(0, 7);
const monthLabel = (date = new Date()) => new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(date);
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
const apiUrl = (path) => `${apiBaseUrl}${path}`;
const taskDueState = (due) => {
  if (due?.startsWith('Today')) return 'today';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due || '')) return 'upcoming';
  const today = localISODate();
  return due < today ? 'overdue' : due === today ? 'today' : 'upcoming';
};
const taskDateValue = (due) => /^\d{4}-\d{2}-\d{2}$/.test(due || '') ? due : '';
const formatTaskDue = (due) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due || '')) return due || 'No due date';
  const state = taskDueState(due);
  if (state === 'today') return `Today · ${formatDate(due)}`;
  if (state === 'overdue') return `Overdue · ${formatDate(due)}`;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return due === localISODate(tomorrow) ? `Tomorrow · ${formatDate(due)}` : new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${due}T00:00:00`));
};
const downloadTransactionsCsv = (transactions) => {
  const escapeCell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const rows = [
    ['Date', 'Description', 'Category', 'Type', 'Amount'],
    ...transactions.map((item) => [item.isoDate, item.name, item.category, item.kind, Number(item.amount).toFixed(2)]),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(escapeCell).join(',')).join('\r\n')}`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `dayflow-transactions-${localISODate().slice(0, 7)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

async function apiWrite(path, method, payload) {
  const csrfResponse = await fetch(apiUrl('/api/auth/csrf'), { credentials: 'include' });
  if (!csrfResponse.ok) throw new Error('Could not start a secure request. Please sign in again.');
  const csrf = await csrfResponse.json();
  const response = await fetch(apiUrl(path), {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', [csrf.headerName]: csrf.token },
    ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
  });
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.detail || data?.message || 'Dayflow could not save that change.');
  return data;
}

function App() {
  const [authState, setAuthState] = useState('checking');
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [page, setPage] = useState('overview');
  const [transactions, setTransactions] = useState(demoTransactions);
  const [tasks, setTasks] = useState(demoTasks);
  const [budgets, setBudgets] = useState(demoBudgets);
  const [goals, setGoals] = useState(demoGoals);
  const [subscriptions, setSubscriptions] = useState(demoSubscriptions);
  const [modal, setModal] = useState(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [editingBudget, setEditingBudget] = useState(null);
  const [editingGoal, setEditingGoal] = useState(null);
  const [contributingGoal, setContributingGoal] = useState(null);
  const [editingSubscription, setEditingSubscription] = useState(null);
  const [toast, setToast] = useState('');
  const [query, setQuery] = useState('');
  const [transactionFilter, setTransactionFilter] = useState('All activity');
  const [taskFilter, setTaskFilter] = useState('All tasks');
  const pageName = navItems.find((item) => item.id === page)?.label || 'Overview';
  const openTaskCount = tasks.filter((task) => !task.done).length;
  const dateLabel = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  const notificationItems = [];
  tasks.filter((task) => !task.done && ['today', 'overdue'].includes(taskDueState(task.due))).slice(0, 4).forEach((task) => {
    const status = taskDueState(task.due);
    notificationItems.push({ key: `task-${task.id}`, title: task.title, detail: `${task.category} task · ${status === 'overdue' ? formatTaskDue(task.due) : 'due today'}`, icon: CheckCheck, tone: status === 'overdue' ? 'gold' : 'sage', page: 'tasks' });
  });
  const notificationToday = localISODate();
  const notificationWeek = localISODate(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 7));
  subscriptions.filter((item) => item.active !== false && item.nextDueDate >= notificationToday && item.nextDueDate <= notificationWeek).slice(0, 4).forEach((item) => {
    notificationItems.push({ key: `bill-${item.id}`, title: item.name, detail: `Bill due ${formatDate(item.nextDueDate)} · ${money(item.amount)}`, icon: CreditCard, tone: 'peach', page: 'budgets' });
  });
  budgets.filter((budget) => Number(budget.limit) > 0 && Number(budget.spent) / Number(budget.limit) >= 0.8).slice(0, 4).forEach((budget) => {
    notificationItems.push({ key: `budget-${budget.id}`, title: `${budget.category} budget`, detail: `${Math.round(Number(budget.spent) / Number(budget.limit) * 100)}% of monthly limit used`, icon: Wallet, tone: 'gold', page: 'budgets' });
  });

  useEffect(() => {
    let active = true;
    fetch(apiUrl('/api/auth/me'), { credentials: 'include' })
      .then(async (response) => {
        if (response.status === 401) return null;
        if (!response.ok) throw new Error('The Dayflow server could not load your account.');
        return response.json();
      })
      .then((account) => {
        if (!active) return;
        setUser(account);
        setAuthState(account ? 'signedIn' : 'signedOut');
      })
      .catch(() => {
        if (!active) return;
        setAuthError('Dayflow could not reach its backend. Start the API and MySQL, or open the sample preview.');
        setAuthState('offline');
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (authState !== 'signedIn' || !user) return;
    let active = true;
    Promise.all([
      fetch(apiUrl('/api/transactions'), { credentials: 'include' }),
      fetch(apiUrl('/api/tasks'), { credentials: 'include' }),
      fetch(apiUrl('/api/budgets'), { credentials: 'include' }),
      fetch(apiUrl('/api/goals'), { credentials: 'include' }),
      fetch(apiUrl('/api/subscriptions'), { credentials: 'include' }),
    ]).then(async ([transactionResponse, taskResponse, budgetResponse, goalResponse, subscriptionResponse]) => {
      if ([transactionResponse, taskResponse, budgetResponse, goalResponse, subscriptionResponse].some((response) => !response.ok)) throw new Error('Could not load your saved Dayflow data.');
      const [savedTransactions, savedTasks, savedBudgets, savedGoals, savedSubscriptions] = await Promise.all([transactionResponse.json(), taskResponse.json(), budgetResponse.json(), goalResponse.json(), subscriptionResponse.json()]);
      if (!active) return;
      setTransactions(savedTransactions.map((item) => ({
        id: item.id, name: item.description, category: item.category, date: formatDate(item.date), isoDate: item.date,
        amount: Number(item.amount), kind: item.kind, icon: transactionIcon(item.kind),
      })));
      setTasks(savedTasks.map((task) => ({ ...task, color: 'sage' })));
      setBudgets(savedBudgets);
      setGoals(savedGoals);
      setSubscriptions(savedSubscriptions);
    }).catch((error) => {
      if (active) notify(error.message);
    });
    return () => { active = false; };
  }, [authState, user]);

  const submitAuth = async (mode, values) => {
    setAuthError('');
    const csrfResponse = await fetch(apiUrl('/api/auth/csrf'), { credentials: 'include' });
    if (!csrfResponse.ok) throw new Error('Could not start a secure sign-in session.');
    const csrf = await csrfResponse.json();
    const response = await fetch(apiUrl(`/api/auth/${mode === 'signup' ? 'signup' : 'login'}`), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', [csrf.headerName]: csrf.token },
      body: JSON.stringify(values),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || data.message || 'Could not sign in. Please try again.');
    setUser(data);
    setAuthState('signedIn');
    setPreviewMode(false);
  };

  const signOut = async () => {
    try {
      const csrfResponse = await fetch(apiUrl('/api/auth/csrf'), { credentials: 'include' });
      const csrf = csrfResponse.ok ? await csrfResponse.json() : null;
      await fetch(apiUrl('/api/auth/logout'), {
        method: 'POST', credentials: 'include',
        headers: csrf ? { [csrf.headerName]: csrf.token } : {},
      });
    } finally {
      setUser(null);
      setPreviewMode(false);
      setAuthState('signedOut');
      setPage('overview');
    }
  };

  if (authState === 'checking') return <div className="auth-loading"><span className="brand-mark"><span /></span><strong>dayflow</strong><div className="loading-line" /></div>;
  if (!user && !previewMode) return <AuthScreen initialError={authError} onSubmit={submitAuth} onPreview={() => { setPreviewMode(true); setAuthError(''); }} />;

  const notify = (message) => {
    setToast(message);
    window.clearTimeout(window.dayflowToast);
    window.dayflowToast = window.setTimeout(() => setToast(''), 2400);
  };

  const toggleTask = async (id) => {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    if (previewMode) {
      setTasks((items) => items.map((item) => item.id === id ? { ...item, done: !item.done } : item));
      return;
    }
    try {
      const saved = await apiWrite(`/api/tasks/${id}/completion`, 'PATCH', { completed: !task.done });
      setTasks((items) => items.map((item) => item.id === id ? { ...item, done: saved.done } : item));
    } catch (error) { notify(error.message); }
  };

  const addTask = async (title, due, category = 'Personal') => {
    try {
      const task = previewMode
        ? { id: Date.now(), title, category, due: due || localISODate(), done: false }
        : await apiWrite('/api/tasks', 'POST', { title, category, due: due || localISODate(), done: false });
      setTasks((items) => [{ ...task, color: 'sage' }, ...items]);
      setModal(null);
      notify('Task added to your list');
    } catch (error) { notify(error.message); }
  };

  const editTask = (task) => {
    setEditingTransaction(null);
    setEditingTask(task);
    setModal('task');
  };

  const updateTask = async (title, due, category, id) => {
    const previous = tasks.find((task) => task.id === id);
    if (!previous) return;
    try {
      const payload = { title, due: due || localISODate(), category, done: previous.done };
      const saved = previewMode ? { ...payload, id } : await apiWrite(`/api/tasks/${id}`, 'PUT', payload);
      setTasks((items) => items.map((task) => task.id === id ? { ...saved, color: task.color || 'sage' } : task));
      setEditingTask(null);
      setModal(null);
      notify('Task updated');
    } catch (error) { notify(error.message); }
  };

  const deleteTask = async (task) => {
    if (!window.confirm(`Delete “${task.title}”? This cannot be undone.`)) return;
    try {
      if (!previewMode) await apiWrite(`/api/tasks/${task.id}`, 'DELETE');
      setTasks((items) => items.filter((item) => item.id !== task.id));
      notify('Task deleted');
    } catch (error) { notify(error.message); }
  };

  const addTransaction = async (name, amount, kind, category) => {
    try {
      const item = previewMode
        ? { id: Date.now(), description: name, category: category || 'Other', date: localISODate(), amount, kind }
        : await apiWrite('/api/transactions', 'POST', {
          description: name, amount: Number(amount), kind, category: category || 'Other',
          date: localISODate(),
        });
      if (item.kind === 'expense') {
        setBudgets((items) => items.map((budget) => budget.category === item.category && budget.monthStart?.slice(0, 7) === item.date.slice(0, 7)
          ? { ...budget, spent: Number(budget.spent) + Number(item.amount) } : budget));
      }
      setTransactions((items) => [{
        id: item.id, name: item.description, category: item.category, date: formatDate(item.date), isoDate: item.date,
        amount: Number(item.amount), kind: item.kind, icon: transactionIcon(item.kind),
      }, ...items]);
      setModal(null);
      notify('Transaction saved');
    } catch (error) { notify(error.message); }
  };

  const editTransaction = (item) => {
    setEditingTask(null);
    setEditingTransaction(item);
    setModal('transaction');
  };

  const updateTransaction = async (name, amount, kind, category, id) => {
    const previous = transactions.find((item) => item.id === id);
    if (!previous) return;
    try {
      const payload = {
        description: name, amount: Number(amount), kind, category,
        date: previous.isoDate,
      };
      const saved = previewMode ? { ...payload, id } : await apiWrite(`/api/transactions/${id}`, 'PUT', payload);
      const updated = {
        id: saved.id ?? id, name: saved.description ?? name, category: saved.category ?? category,
        date: formatDate(saved.date ?? previous.isoDate), isoDate: saved.date ?? previous.isoDate,
        amount: Number(saved.amount ?? amount), kind: saved.kind ?? kind,
        icon: transactionIcon(saved.kind ?? kind),
      };
      setTransactions((items) => items.map((item) => item.id === id ? updated : item));
      setBudgets((items) => items.map((budget) => {
        let spent = Number(budget.spent || 0);
        if (previous.kind === 'expense' && budget.category === previous.category && budget.monthStart?.slice(0, 7) === previous.isoDate?.slice(0, 7)) spent -= Number(previous.amount);
        if (updated.kind === 'expense' && budget.category === updated.category && budget.monthStart?.slice(0, 7) === updated.isoDate?.slice(0, 7)) spent += Number(updated.amount);
        return { ...budget, spent: Math.max(0, spent) };
      }));
      setEditingTransaction(null);
      setModal(null);
      notify('Transaction updated');
    } catch (error) { notify(error.message); }
  };

  const deleteTransaction = async (item) => {
    if (!window.confirm(`Delete “${item.name}”? This cannot be undone.`)) return;
    try {
      if (!previewMode) await apiWrite(`/api/transactions/${item.id}`, 'DELETE');
      setTransactions((items) => items.filter((transaction) => transaction.id !== item.id));
      if (item.kind === 'expense') {
        setBudgets((items) => items.map((budget) => budget.category === item.category && budget.monthStart?.slice(0, 7) === item.isoDate?.slice(0, 7)
          ? { ...budget, spent: Math.max(0, Number(budget.spent || 0) - Number(item.amount)) } : budget));
      }
      notify('Transaction deleted');
    } catch (error) { notify(error.message); }
  };

  const addBudget = async (category, limit) => {
    const monthStart = `${localISODate().slice(0, 7)}-01`;
    try {
      const existing = budgets.find((item) => item.category === category && item.monthStart?.slice(0, 7) === monthStart.slice(0, 7));
      const budget = previewMode
        ? { id: Date.now(), category, limit: Number(limit), spent: 0, monthStart }
        : await apiWrite(existing ? `/api/budgets/${existing.id}` : '/api/budgets', existing ? 'PUT' : 'POST', { category, limit: Number(limit), monthStart });
      setBudgets((items) => [budget, ...items.filter((item) => !(item.category === category && item.monthStart === monthStart))]);
      setModal(null);
      notify('Monthly budget saved');
    } catch (error) { notify(error.message); }
  };

  const updateBudget = async (category, limit, id) => {
    const previous = budgets.find((item) => item.id === id);
    if (!previous) return;
    if (budgets.some((item) => item.id !== id && item.category === category && item.monthStart?.slice(0, 7) === previous.monthStart?.slice(0, 7))) {
      notify('A budget already exists for that category and month');
      return;
    }
    try {
      const payload = { category, limit: Number(limit), monthStart: previous.monthStart };
      const saved = previewMode ? { ...previous, ...payload } : await apiWrite(`/api/budgets/${id}`, 'PUT', payload);
      setBudgets((items) => items.map((item) => item.id === id ? saved : item));
      setEditingBudget(null);
      setModal(null);
      notify('Budget updated');
    } catch (error) { notify(error.message); }
  };

  const deleteBudget = async (budget) => {
    if (!window.confirm(`Delete the ${budget.category} budget for ${monthLabel(new Date(`${budget.monthStart}T00:00:00`))}?`)) return;
    try {
      if (!previewMode) await apiWrite(`/api/budgets/${budget.id}`, 'DELETE');
      setBudgets((items) => items.filter((item) => item.id !== budget.id));
      notify('Budget deleted');
    } catch (error) { notify(error.message); }
  };

  const addGoal = async (title, targetAmount, targetDate, emoji) => {
    try {
      const goal = previewMode
        ? { id: Date.now(), title, emoji, savedAmount: 0, targetAmount: Number(targetAmount), targetDate: targetDate || null }
        : await apiWrite('/api/goals', 'POST', { title, emoji, savedAmount: 0, targetAmount: Number(targetAmount), targetDate: targetDate || null });
      setGoals((items) => [goal, ...items]);
      setModal(null);
      notify('Savings goal created');
    } catch (error) { notify(error.message); }
  };

  const updateGoal = async (title, targetAmount, targetDate, emoji, savedAmount, id) => {
    const previous = goals.find((item) => item.id === id);
    if (!previous) return;
    try {
      const payload = { title, emoji, savedAmount: Number(savedAmount), targetAmount: Number(targetAmount), targetDate: targetDate || null };
      const saved = previewMode ? { ...payload, id } : await apiWrite(`/api/goals/${id}`, 'PUT', payload);
      setGoals((items) => items.map((item) => item.id === id ? saved : item));
      setEditingGoal(null);
      setModal(null);
      notify('Savings goal updated');
    } catch (error) { notify(error.message); }
  };

  const addGoalContribution = async (amount, id) => {
    const goal = goals.find((item) => item.id === id);
    if (!goal) return;
    try {
      const payload = { title: goal.title, emoji: goal.emoji, savedAmount: Number(goal.savedAmount) + Number(amount), targetAmount: Number(goal.targetAmount), targetDate: goal.targetDate || null };
      const saved = previewMode ? { ...goal, ...payload } : await apiWrite(`/api/goals/${id}`, 'PUT', payload);
      setGoals((items) => items.map((item) => item.id === id ? saved : item));
      setContributingGoal(null);
      setModal(null);
      notify('Savings progress recorded');
    } catch (error) { notify(error.message); }
  };

  const deleteGoal = async (goal) => {
    if (!window.confirm(`Delete the “${goal.title}” savings goal?`)) return;
    try {
      if (!previewMode) await apiWrite(`/api/goals/${goal.id}`, 'DELETE');
      setGoals((items) => items.filter((item) => item.id !== goal.id));
      notify('Savings goal deleted');
    } catch (error) { notify(error.message); }
  };

  const addSubscription = async (name, amount, billingCycle, nextDueDate) => {
    try {
      const subscription = previewMode
        ? { id: Date.now(), name, category: 'Subscriptions', amount: Number(amount), billingCycle, nextDueDate, active: true }
        : await apiWrite('/api/subscriptions', 'POST', { name, category: 'Subscriptions', amount: Number(amount), billingCycle, nextDueDate });
      setSubscriptions((items) => [...items, subscription].sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate)));
      setModal(null);
      notify('Recurring bill saved');
    } catch (error) { notify(error.message); }
  };

  const updateSubscription = async (name, amount, billingCycle, nextDueDate, id) => {
    const previous = subscriptions.find((item) => item.id === id);
    if (!previous) return;
    try {
      const payload = { name, category: previous.category || 'Subscriptions', amount: Number(amount), billingCycle, nextDueDate };
      const saved = previewMode ? { ...previous, ...payload } : await apiWrite(`/api/subscriptions/${id}`, 'PUT', payload);
      setSubscriptions((items) => items.map((item) => item.id === id ? saved : item).sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate)));
      setEditingSubscription(null);
      setModal(null);
      notify('Recurring bill updated');
    } catch (error) { notify(error.message); }
  };

  const markSubscriptionPaid = async (subscription) => {
    try {
      let updated;
      let historySynced = previewMode;
      if (previewMode) {
        const nextDueDate = new Date(`${subscription.nextDueDate}T00:00:00`);
        const today = new Date();
        do {
          if (subscription.billingCycle === 'weekly') nextDueDate.setDate(nextDueDate.getDate() + 7);
          else if (subscription.billingCycle === 'yearly') nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
          else nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        } while (nextDueDate <= today);
        updated = { ...subscription, nextDueDate: nextDueDate.toISOString().slice(0, 10), lastPaidOn: today.toISOString().slice(0, 10) };
      } else updated = await apiWrite(`/api/subscriptions/${subscription.id}/paid`, 'PATCH');
      setSubscriptions((items) => items.map((item) => item.id === subscription.id ? updated : item));
      const paidOn = updated.lastPaidOn || localISODate();
      if (previewMode) {
        setTransactions((items) => [{
          id: Date.now(), name: `Subscription: ${subscription.name}`, category: subscription.category,
          date: formatDate(paidOn), isoDate: paidOn, amount: Number(subscription.amount), kind: 'expense', icon: ShoppingBag,
        }, ...items]);
      } else {
        try {
          const response = await fetch(apiUrl('/api/transactions'), { credentials: 'include' });
          if (response.ok) {
            const savedTransactions = await response.json();
            setTransactions(savedTransactions.map((item) => ({
              id: item.id, name: item.description, category: item.category, date: formatDate(item.date), isoDate: item.date,
              amount: Number(item.amount), kind: item.kind, icon: transactionIcon(item.kind),
            })));
            historySynced = true;
          }
        } catch { /* The payment is saved; transaction history can sync on refresh. */ }
      }
      setBudgets((items) => items.map((budget) => budget.category === subscription.category && budget.monthStart?.slice(0, 7) === paidOn.slice(0, 7)
        ? { ...budget, spent: Number(budget.spent) + Number(subscription.amount) } : budget));
      notify(historySynced ? 'Payment recorded and due date updated' : 'Payment saved; refresh to load its transaction');
    } catch (error) { notify(error.message); }
  };

  const removeSubscription = async (id) => {
    const subscription = subscriptions.find((item) => item.id === id);
    if (!subscription || !window.confirm(`Remove the recurring bill “${subscription.name}”?`)) return;
    try {
      if (!previewMode) await apiWrite(`/api/subscriptions/${id}`, 'DELETE');
      setSubscriptions((items) => items.filter((item) => item.id !== id));
      notify('Recurring bill removed');
    } catch (error) { notify(error.message); }
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="app-shell">
        <aside className="sidebar">
          <button className="brand" onClick={() => setPage('overview')} aria-label="Dayflow overview">
            <span className="brand-mark"><span /></span><span>dayflow</span>
          </button>
          <div className="workspace-label">YOUR SPACE</div>
          <nav className="primary-nav" aria-label="Main navigation">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button key={id} className={`nav-item ${page === id ? 'active' : ''}`} onClick={() => setPage(id)}>
                <Icon size={17} strokeWidth={1.8} /><span>{label}</span>
                {id === 'tasks' && <span className="nav-count">{openTaskCount}</span>}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="sidebar-tip"><span className="tip-icon"><Sparkles size={15} /></span><div><strong>Small steps count</strong><p>{goals[0] ? `${Math.min(100, Math.round(Number(goals[0].savedAmount) / Number(goals[0].targetAmount) * 100))}% of the way to ${goals[0].title}.` : 'Choose a little goal to look forward to.'}</p></div></div>
            <button className="nav-item"><Settings size={17} strokeWidth={1.8} /><span>Settings</span></button>
            <button className="nav-item"><CircleHelp size={17} strokeWidth={1.8} /><span>Help & support</span></button>
            <div className="profile-row"><div className="profile-avatar">{(user?.fullName || 'N').slice(0, 1).toUpperCase()}</div><div className="profile-copy"><strong>{user?.fullName || 'Preview mode'}</strong><span>{previewMode ? 'Sample data' : user?.email}</span></div><button className="profile-logout" onClick={signOut} aria-label="Sign out" title="Sign out"><X size={14} /></button></div>
          </div>
        </aside>

        <main className="main-area">
          <header className="topbar">
            <div className="breadcrumb"><span>My space</span><span className="slash">/</span><strong>{pageName}</strong></div>
            <div className="topbar-actions"><span className="date-label">{dateLabel}</span><div className="notification-wrap"><button className="icon-button notification-button" aria-label={`Notifications${notificationItems.length ? `, ${notificationItems.length} reminders` : ''}`} aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((open) => !open)}><Bell size={17} />{notificationItems.length > 0 && <i />}</button>{notificationsOpen && <NotificationCenter items={notificationItems} onNavigate={(nextPage) => { setPage(nextPage); setNotificationsOpen(false); }} onClose={() => setNotificationsOpen(false)} />}</div><button className="top-avatar avatar-button" onClick={signOut} aria-label="Sign out">{(user?.fullName || 'N').slice(0, 1).toUpperCase()}</button></div>
          </header>
          <div className="mobile-brand"><span className="brand-mark"><span /></span><strong>dayflow</strong><div className="notification-wrap"><button className="icon-button notification-button" aria-label={`Notifications${notificationItems.length ? `, ${notificationItems.length} reminders` : ''}`} aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((open) => !open)}><Bell size={17} />{notificationItems.length > 0 && <i />}</button>{notificationsOpen && <NotificationCenter items={notificationItems} onNavigate={(nextPage) => { setPage(nextPage); setNotificationsOpen(false); }} onClose={() => setNotificationsOpen(false)} />}</div><button className="icon-button" aria-label="Sign out" onClick={signOut}><X size={18} /></button></div>

          {previewMode && <div className="preview-banner"><Sparkles size={14} /><span><strong>Sample preview</strong> — demo data only; changes reset when you refresh.</span><button onClick={() => { setPreviewMode(false); setAuthState('offline'); }}>Exit preview</button></div>}

          <AnimatePresence mode="wait">
            <motion.div key={page} className="page-content" initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.2 }}>
              {page === 'overview' && <Overview transactions={transactions} tasks={tasks} subscriptions={subscriptions} budgets={budgets} goals={goals} previewMode={previewMode} onPage={setPage} onToggleTask={toggleTask} onQuickAdd={() => setModal('quick')} onAddTask={() => { setEditingTask(null); setModal('task'); }} onContribute={(goal) => { setContributingGoal(goal); setModal('contribution'); }} />}
              {page === 'transactions' && <Transactions transactions={transactions} query={query} setQuery={setQuery} filter={transactionFilter} setFilter={setTransactionFilter} onAdd={() => { setEditingTransaction(null); setEditingTask(null); setModal('transaction'); }} onEdit={editTransaction} onDelete={deleteTransaction} />}
              {page === 'tasks' && <Tasks tasks={tasks} filter={taskFilter} setFilter={setTaskFilter} onToggle={toggleTask} onAdd={() => { setEditingTask(null); setEditingTransaction(null); setModal('task'); }} onEdit={editTask} onDelete={deleteTask} />}
              {page === 'budgets' && <Budgets budgets={budgets} goals={goals} subscriptions={subscriptions} onAddBudget={() => { setEditingBudget(null); setModal('budget'); }} onEditBudget={(budget) => { setEditingBudget(budget); setModal('budget'); }} onDeleteBudget={deleteBudget} onAddGoal={() => { setEditingGoal(null); setModal('goal'); }} onEditGoal={(goal) => { setEditingGoal(goal); setModal('goal'); }} onDeleteGoal={deleteGoal} onContribute={(goal) => { setContributingGoal(goal); setModal('contribution'); }} onAddSubscription={() => { setEditingSubscription(null); setModal('subscription'); }} onEditSubscription={(item) => { setEditingSubscription(item); setModal('subscription'); }} onMarkPaid={markSubscriptionPaid} onRemoveSubscription={removeSubscription} onNotify={notify} />}
            </motion.div>
          </AnimatePresence>
        </main>
        <div className="mobile-nav" aria-label="Mobile navigation">
          {navItems.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setPage(id)} className={page === id ? 'active' : ''} aria-label={label}><Icon size={18} /><span>{label === 'Personal tasks' ? 'Tasks' : label === 'Budgets & goals' ? 'Plans' : label}</span></button>)}
        </div>
        <AnimatePresence>{toast && <motion.div className="toast" role="status" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}><Check size={15} />{toast}</motion.div>}</AnimatePresence>
        <AnimatePresence>{modal && <QuickModal key={`${modal}-${editingTransaction?.id ?? editingTask?.id ?? editingBudget?.id ?? editingGoal?.id ?? contributingGoal?.id ?? editingSubscription?.id ?? 'new'}`} type={modal} previewMode={previewMode} editingTransaction={editingTransaction} editingTask={editingTask} editingBudget={editingBudget} editingGoal={editingGoal} contributingGoal={contributingGoal} editingSubscription={editingSubscription} onClose={() => { setModal(null); setEditingTransaction(null); setEditingTask(null); setEditingBudget(null); setEditingGoal(null); setContributingGoal(null); setEditingSubscription(null); }} onAddTask={addTask} onUpdateTask={updateTask} onAddTransaction={addTransaction} onUpdateTransaction={updateTransaction} onAddBudget={addBudget} onUpdateBudget={updateBudget} onAddGoal={addGoal} onUpdateGoal={updateGoal} onAddGoalContribution={addGoalContribution} onAddSubscription={addSubscription} onUpdateSubscription={updateSubscription} />}</AnimatePresence>
      </div>
    </MotionConfig>
  );
}

function AuthScreen({ initialError, onSubmit, onPreview }) {
  const [mode, setMode] = useState('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await onSubmit(mode, mode === 'signup'
        ? { fullName, email, password, defaultCurrency: 'INR', timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata' }
        : { email, password });
    } catch (failure) {
      setError(failure.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return <main className="auth-screen">
    <section className="auth-story">
      <div className="auth-brand"><span className="brand-mark"><span /></span><strong>dayflow</strong></div>
      <div className="auth-story-copy"><span className="auth-eyebrow"><span /> A softer way to stay on top of it all</span><h1>Money and life,<br /><em>in sync.</em></h1><p>Make room for the things that matter. Keep your plans, payments, and little everyday wins all in one place.</p>
        <div className="auth-feature-list"><div><span className="auth-feature-icon sage"><Wallet size={16} /></span><span><strong>Know where you stand</strong><small>Your spending, without the spreadsheet spiral.</small></span></div><div><span className="auth-feature-icon peach"><CheckCheck size={16} /></span><span><strong>Keep the little things moving</strong><small>Bills, reminders, and personal plans together.</small></span></div></div>
      </div>
      <div className="auth-quote"><span>“</span><div><p>A little more in sync, one day at a time.</p><small>YOUR DAYFLOW SPACE</small></div><div className="quote-orbit orbit-one" /><div className="quote-orbit orbit-two" /></div>
      <div className="auth-copyright">A quieter kind of productivity <span>·</span> Made for real life</div>
    </section>
    <section className="auth-form-side"><div className="auth-mobile-brand"><span className="brand-mark"><span /></span><strong>dayflow</strong></div><div className="auth-card-wrap"><div className="auth-card-top"><div className="auth-card-icon"><Sparkles size={17} /></div><span>YOUR PERSONAL SPACE</span></div><h2>{mode === 'login' ? 'Welcome back' : 'Let’s make a little space'}</h2><p className="auth-subtitle">{mode === 'login' ? 'Pick up right where you left off.' : 'Create your account and start with one small step.'}</p>
      {(initialError || error) && <div className={`auth-alert ${initialError && !error ? 'offline' : ''}`} role="alert">{error || initialError}</div>}
      {notice && <div className="auth-success" role="status">{notice}</div>}
      <form className="auth-form" onSubmit={submit}>
        {mode === 'signup' && <label>Your name<div className="auth-input"><input autoComplete="name" required minLength={2} maxLength={80} value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="What should we call you?" /></div></label>}
        <label>Email address<div className="auth-input"><input type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></div></label>
        <label>Password<div className="auth-input"><input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'signup' ? 10 : 1} maxLength={72} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === 'signup' ? 'At least 10 characters' : 'Your password'} /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>
        <button className="auth-submit" type="submit" disabled={busy}>{busy ? <span className="button-spinner" /> : null}{busy ? 'One moment…' : mode === 'login' ? 'Sign in to Dayflow' : 'Create your space'}<ArrowRight size={16} /></button>
      </form>
      <div className="auth-switch">{mode === 'login' ? 'New to Dayflow?' : 'Already have an account?'} <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setNotice(''); }}>{mode === 'login' ? 'Create an account' : 'Sign in'}</button></div>
      <div className="auth-security"><span><Check size={12} /></span>Your account is private and protected with a secure session.</div>
      <button className="preview-link" onClick={onPreview}>Just exploring? <strong>Open sample preview</strong><ArrowRight size={13} /></button>
    </div><div className="auth-mobile-note">A quieter kind of productivity · Made for real life</div></section>
  </main>;
}

function PageHeading({ eyebrow, title, description, action, onAction }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action && <button className="button-primary" onClick={onAction}><Plus size={16} />{action}</button>}</div>;
}

function NotificationCenter({ items, onNavigate, onClose }) {
  return <section className="notification-panel" aria-label="Reminders">
    <div className="notification-panel-heading"><div><strong>Your reminders</strong><span>{items.length ? `${items.length} to keep in view` : 'A calm moment'}</span></div><button className="icon-button" aria-label="Close reminders" onClick={onClose}><X size={16} /></button></div>
    {items.length ? <div className="notification-list">{items.slice(0, 7).map(({ key, title, detail, icon: Icon, tone, page }) => <button className="notification-item" key={key} onClick={() => onNavigate(page)}><span className={`notification-item-icon ${tone}`}><Icon size={15} /></span><span className="notification-item-copy"><strong>{title}</strong><small>{detail}</small></span><ArrowRight size={14} /></button>)}</div> : <div className="notification-empty"><span><Check size={16} /></span><strong>You’re all caught up</strong><p>New reminders will show up here.</p></div>}
    {items.length > 7 && <div className="notification-more">Showing 7 of {items.length} reminders</div>}
  </section>;
}

function Overview({ transactions, tasks, subscriptions, budgets, goals, previewMode, onPage, onToggleTask, onQuickAdd, onAddTask, onContribute }) {
  const [chartMonths, setChartMonths] = useState(6);
  const openTasks = tasks.filter((task) => !task.done);
  const latest = transactions.slice(0, 3);
  const now = new Date();
  const currentMonth = localISODate(now).slice(0, 7);
  const previousDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonth = localISODate(previousDate).slice(0, 7);
  const monthTransactions = transactions.filter((item) => monthKey(item.isoDate) === currentMonth);
  const income = monthTransactions.filter((item) => item.kind === 'income').reduce((sum, item) => sum + Number(item.amount), 0);
  const spent = monthTransactions.filter((item) => item.kind === 'expense').reduce((sum, item) => sum + Number(item.amount), 0);
  const spendingByCategory = Object.entries(monthTransactions.reduce((totals, item) => {
    if (item.kind === 'expense') totals[item.category] = (totals[item.category] || 0) + Number(item.amount);
    return totals;
  }, {})).map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
  const net = income - spent;
  const balance = transactions.reduce((sum, item) => sum + (item.kind === 'income' ? 1 : -1) * Number(item.amount), 0);
  const budgetPlan = budgets.filter((item) => monthKey(item.monthStart) === currentMonth).reduce((sum, item) => sum + Number(item.limit), 0);
  const dueBy = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
  const upcomingBills = subscriptions.filter((item) => item.active !== false && item.nextDueDate >= localISODate(now) && item.nextDueDate <= localISODate(dueBy));
  const upcomingTotal = upcomingBills.reduce((sum, item) => sum + Number(item.amount), 0);
  const previousSpend = transactions.filter((item) => monthKey(item.isoDate) === previousMonth && item.kind === 'expense').reduce((sum, item) => sum + Number(item.amount), 0);
  const spendChange = previousSpend ? Math.round((spent - previousSpend) / previousSpend * 100) : null;
  const history = previewMode ? spendingHistory.slice(-chartMonths) : Array.from({ length: chartMonths }, (_, index) => {
    const month = new Date(now.getFullYear(), now.getMonth() - chartMonths + 1 + index, 1);
    const key = localISODate(month).slice(0, 7);
    return { month: new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(month), amount: transactions
      .filter((item) => monthKey(item.isoDate) === key && item.kind === 'expense')
      .reduce((sum, item) => sum + Number(item.amount), 0) };
  });
  const primaryGoal = goals[0];
  const goalProgress = primaryGoal?.targetAmount ? Math.min(100, Math.round(Number(primaryGoal.savedAmount) / Number(primaryGoal.targetAmount) * 100)) : 0;
  const goalRemaining = primaryGoal ? Math.max(0, Number(primaryGoal.targetAmount) - Number(primaryGoal.savedAmount)) : 0;
  const goalMonths = primaryGoal?.targetDate
    ? Math.max(1, Math.ceil((new Date(`${primaryGoal.targetDate}T00:00:00`) - new Date(now.getFullYear(), now.getMonth(), 1)) / (1000 * 60 * 60 * 24 * 30.4375)))
    : 12;
  const suggestedContribution = primaryGoal ? Math.ceil(goalRemaining / goalMonths) : 0;
  return <>
    <PageHeading eyebrow={new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).format(now).toUpperCase()} title="A little more in sync." description="Your money and to-dos, together in one calm place." action="Quick add" onAction={onQuickAdd} />
    <div className="summary-grid">
      <SummaryCard label="Available balance" value={`${balance < 0 ? '−' : ''}${money(balance)}`} note={`${net >= 0 ? '↑' : '↓'} ${money(net)} net this month`} icon={Wallet} tone="green" />
      <SummaryCard label="Spent this month" value={money(spent)} note={budgetPlan ? `${Math.round(spent / budgetPlan * 100)}% of your ${money(budgetPlan)} plan` : 'Set a budget to track your plan'} icon={ArrowUpRight} tone="peach" />
      <SummaryCard label="Bills coming up" value={money(upcomingTotal)} note={`${upcomingBills.length} due in the next 7 days`} icon={CreditCard} tone="blue" />
      <SummaryCard label="Tasks to do" value={String(openTasks.length)} note={`${openTasks.filter((task) => taskDueState(task.due) === 'today').length} due today`} icon={CheckCheck} tone="lilac" />
    </div>
    <div className="dashboard-grid">
      <div className="main-column">
        <section className="panel spending-panel">
          <div className="panel-heading"><div><h2>Your spending rhythm</h2><p>A little view of the last {chartMonths} months</p></div><label className="chart-range-control"><span className="sr-only">Spending chart range</span><select className="select-button" value={chartMonths} onChange={(event) => setChartMonths(Number(event.target.value))}><option value={3}>Last 3 months</option><option value={6}>Last 6 months</option></select><ChevronDown size={14} /></label></div>
          <div className="chart-total"><strong>{money(spent)}</strong>{spendChange !== null && <span className="positive-chip"><TrendingUp size={13} /> {spendChange > 0 ? '+' : ''}{spendChange}%</span>}<small>{spendChange === null ? 'this month' : 'vs. last month'}</small></div>
          <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={history} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}><defs><linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5b8a68" stopOpacity={0.2} /><stop offset="100%" stopColor="#5b8a68" stopOpacity={0.015} /></linearGradient></defs><CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 5" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} dy={9} /><Tooltip cursor={{ stroke: 'var(--line)', strokeDasharray: '3 4' }} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, color: 'var(--ink)', fontSize: 12 }} formatter={(value) => [money(value), 'Spent']} /><Area type="monotone" dataKey="amount" stroke="#557c5e" strokeWidth={2.4} fill="url(#spendFill)" activeDot={{ r: 5, fill: '#557c5e', stroke: 'var(--surface)', strokeWidth: 3 }} animationDuration={800} /></AreaChart></ResponsiveContainer></div>
          <div className="chart-legend"><span><i className="legend-dot spent" />Actual spending</span><span><i className="legend-dot budget" />Monthly plan · {money(budgetPlan)}</span></div>
        </section>
        <section className="panel transactions-panel">
          <div className="panel-heading"><div><h2>Recent activity</h2><p>Little moves add up</p></div><button className="text-button" onClick={() => onPage('transactions')}>All transactions <ArrowRight size={14} /></button></div>
          <div className="activity-list">{latest.map((item) => <TransactionRow key={item.id} item={item} />)}</div>
        </section>
        <section className="panel category-breakdown">
          <div className="panel-heading"><div><h2>Spending by category</h2><p>Where this month’s expenses went</p></div><span className="category-period">{monthLabel(now)}</span></div>
          {spendingByCategory.length ? <div className="category-list">{spendingByCategory.slice(0, 5).map(({ category, amount }, index) => {
            const share = spent ? Math.round(amount / spent * 100) : 0;
            return <div className="category-spend-row" key={category}><div className="category-spend-heading"><strong>{category}</strong><span>{money(amount)} <i>·</i> {share}%</span></div><div className="category-spend-track"><motion.div className={`category-spend-fill tone-${index % 5}`} initial={{ width: 0 }} animate={{ width: `${share}%` }} transition={{ duration: 0.65, delay: index * 0.06 }} /></div></div>;
          })}</div> : <div className="category-empty"><span><ShoppingBag size={16} /></span><strong>No expenses recorded this month</strong><p>Add a transaction to see your spending breakdown.</p></div>}
          {spendingByCategory.length > 0 && <div className="category-total"><span>Total recorded expenses</span><strong>{money(spent)}</strong></div>}
        </section>
      </div>
      <div className="side-column">
        <section className="panel tasks-panel">
          <div className="panel-heading"><div><h2>Coming up</h2><p>A few things on your mind</p></div><button className="round-add" aria-label="Add a task" onClick={onAddTask}><Plus size={16} /></button></div>
          {upcomingBills.length > 0 && <div className="bill-reminder"><span className="bill-icon"><Zap size={16} /></span><div><strong>{upcomingBills[0].name}</strong><small>Recurring bill · {money(upcomingBills[0].amount)}</small></div><span className="due-tag">{formatDate(upcomingBills[0].nextDueDate)}</span></div>}
          {openTasks.slice().sort((a, b) => (a.due || '').localeCompare(b.due || '')).slice(0, 3).map((task) => <TaskRow key={task.id} task={task} onToggle={onToggleTask} compact />)}
          <button className="panel-link" onClick={() => onPage('tasks')}>See your task list <ArrowRight size={14} /></button>
        </section>
        <section className="panel goal-panel">
          <div className="panel-heading"><div><h2>Saving for something</h2><p>Your next little milestone</p></div><span className="goal-spark"><Sparkles size={16} /></span></div>
          {primaryGoal ? <><div className="goal-info"><div className="goal-emoji">{primaryGoal.emoji}</div><div><strong>{primaryGoal.title}</strong><small>{money(primaryGoal.savedAmount)} <span>of</span> {money(primaryGoal.targetAmount)}</small></div></div>
          <div className="progress-track"><motion.div className="progress-fill" initial={{ width: 0 }} animate={{ width: `${goalProgress}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} /></div>
          <div className="progress-caption"><span>{goalProgress}% there</span><span>Target: {primaryGoal.targetDate ? new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(new Date(`${primaryGoal.targetDate}T00:00:00`)) : 'Set a date'}</span></div></> : <div className="column-empty">Set a savings goal to see it here.</div>}
          {primaryGoal
            ? <button className="suggestion" onClick={() => onContribute(primaryGoal)} disabled={goalRemaining === 0}><span className="suggestion-icon"><Sparkles size={13} /></span><span>{goalRemaining === 0 ? 'Goal reached' : 'Suggested monthly pace'} <strong>{goalRemaining === 0 ? 'You hit your savings target' : `Add ${money(suggestedContribution)} toward ${primaryGoal.title}`}</strong></span><ArrowRight size={14} /></button>
            : <button className="suggestion" onClick={() => onPage('budgets')}><span className="suggestion-icon"><Sparkles size={13} /></span><span>Make a little plan <strong>Create a savings goal</strong></span><ArrowRight size={14} /></button>}
        </section>
      </div>
    </div>
  </>;
}

function SummaryCard({ label, value, note, icon: Icon, tone }) {
  return <motion.div className="summary-card" whileHover={{ y: -2 }} transition={{ duration: 0.18 }}><div className={`summary-icon ${tone}`}><Icon size={17} strokeWidth={1.8} /></div><div className="summary-label">{label}</div><div className="summary-value">{value}</div><div className="summary-note">{note}</div></motion.div>;
}

function TransactionRow({ item }) {
  const Icon = item.icon;
  return <div className="transaction-row"><div className={`transaction-icon ${item.kind}`}><Icon size={16} /></div><div className="transaction-copy"><strong>{item.name}</strong><span>{item.category} <i>·</i> {item.date}</span></div><div className={`transaction-amount ${item.kind}`}>{item.kind === 'income' ? '+' : '−'}{money(item.amount)}</div></div>;
}

function TaskRow({ task, onToggle, compact = false }) {
  return <div className={`task-row ${task.done ? 'completed' : ''} ${compact ? 'compact' : ''}`}><button className={`task-check ${task.done ? 'checked' : ''}`} onClick={() => onToggle(task.id)} aria-label={task.done ? `Reopen ${task.title}` : `Complete ${task.title}`}>{task.done && <Check size={12} />}</button><div className="task-copy"><strong>{task.title}</strong><span>{task.category} <i>·</i> {formatTaskDue(task.due)}</span></div></div>;
}

function Transactions({ transactions, query, setQuery, filter, setFilter, onAdd, onEdit, onDelete }) {
  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 10;
  useEffect(() => { setPageIndex(0); }, [query, filter]);
  const now = new Date();
  const currentMonth = localISODate(now).slice(0, 7);
  const monthly = transactions.filter((item) => monthKey(item.isoDate) === currentMonth);
  const monthIncome = monthly.filter((item) => item.kind === 'income').reduce((sum, item) => sum + Number(item.amount), 0);
  const monthExpenses = monthly.filter((item) => item.kind === 'expense').reduce((sum, item) => sum + Number(item.amount), 0);
  const monthNet = monthIncome - monthExpenses;
  const filtered = useMemo(() => transactions.filter((item) => {
    const matchesQuery = `${item.name} ${item.category}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === 'All activity' || (filter === 'Income' ? item.kind === 'income' : item.kind === 'expense');
    return matchesQuery && matchesFilter;
  }), [transactions, query, filter]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(pageIndex, pageCount - 1);
  const pageTransactions = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const firstVisible = filtered.length ? currentPage * pageSize + 1 : 0;
  const lastVisible = Math.min((currentPage + 1) * pageSize, filtered.length);
  return <>
    <PageHeading eyebrow="YOUR MONEY, MADE CLEAR" title="Transactions" description="Every little move, in one simple timeline." action="Add transaction" onAction={onAdd} />
    <div className="summary-grid transaction-stats"><SummaryCard label={`Income · ${monthLabel(now)}`} value={money(monthIncome)} note={`Across ${monthly.filter((item) => item.kind === 'income').length} deposits`} icon={ArrowDownLeft} tone="green" /><SummaryCard label={`Expenses · ${monthLabel(now)}`} value={money(monthExpenses)} note={`Across ${monthly.filter((item) => item.kind === 'expense').length} purchases`} icon={ArrowUpRight} tone="peach" /><SummaryCard label="Net cash flow" value={`${monthNet < 0 ? '−' : '+'}${money(monthNet)}`} note={monthNet >= 0 ? 'A little ahead this month' : 'Spending is above income this month'} icon={TrendingUp} tone="blue" /><SummaryCard label="Transactions" value={String(monthly.length)} note={`So far in ${monthLabel(now)}`} icon={FileText} tone="lilac" /></div>
    <section className="panel full-panel"><div className="panel-heading table-heading"><div><h2>All activity</h2><p>{transactions.length ? `${transactions.length} saved records` : 'No saved records yet'}</p></div><div className="transaction-heading-actions"><button className="select-button" onClick={() => downloadTransactionsCsv(transactions)} disabled={!transactions.length}><Download size={14} /> Export CSV</button><button className="select-button" onClick={() => setFilter(filter === 'All activity' ? 'Expenses' : 'All activity')}><Filter size={14} /> Filter</button></div></div>
      <div className="table-tools"><div className="search-field"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search transactions" aria-label="Search transactions" /></div><div className="segmented">{['All activity', 'Income', 'Expenses'].map((option) => <button key={option} className={filter === option ? 'selected' : ''} onClick={() => setFilter(option)}>{option}</button>)}</div></div>
      <div className="transaction-table-wrap"><table className="transaction-table"><thead><tr><th>Transaction</th><th>Category</th><th>Date</th><th>Type</th><th className="align-right">Amount</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{pageTransactions.map((item) => <tr key={item.id}><td><div className="table-name"><span className={`transaction-icon ${item.kind}`}><item.icon size={15} /></span><strong>{item.name}</strong></div></td><td>{item.category}</td><td>{item.date}</td><td><span className={`type-pill ${item.kind}`}>{item.kind === 'income' ? 'Income' : 'Expense'}</span></td><td className={`align-right transaction-amount ${item.kind}`}>{item.kind === 'income' ? '+' : '−'}{money(item.amount)}</td><td className="transaction-actions"><button className="transaction-action" onClick={() => onEdit(item)} aria-label={`Edit ${item.name}`} title="Edit transaction"><Pencil size={14} /></button><button className="transaction-action danger" onClick={() => onDelete(item)} aria-label={`Delete ${item.name}`} title="Delete transaction"><Trash2 size={14} /></button></td></tr>)}</tbody></table>{filtered.length === 0 && <div className="empty-state"><span><Search size={19} /></span><strong>No transactions found</strong><p>Try a different search or filter.</p></div>}</div>
      <div className="table-footer"><span>Showing {firstVisible}–{lastVisible} of {filtered.length} matching transactions</span><div><button onClick={() => setPageIndex(currentPage - 1)} disabled={currentPage === 0} aria-label="Previous page"><ArrowLeft size={14} /></button><span>{currentPage + 1} / {pageCount}</span><button onClick={() => setPageIndex(currentPage + 1)} disabled={currentPage >= pageCount - 1} aria-label="Next page"><ArrowRight size={14} /></button></div></div>
    </section>
  </>;
}

function Tasks({ tasks, filter, setFilter, onToggle, onAdd, onEdit, onDelete }) {
  const visible = tasks.filter((task) => filter === 'All tasks' || (filter === 'Personal' ? task.category === 'Personal' : filter === 'Money' ? task.category === 'Money' : task.done));
  const dueTasks = visible.filter((task) => !task.done);
  const todayTasks = dueTasks.filter((task) => taskDueState(task.due) === 'today');
  const overdueTasks = dueTasks.filter((task) => taskDueState(task.due) === 'overdue');
  const upcomingTasks = dueTasks.filter((task) => taskDueState(task.due) === 'upcoming');
  const completed = visible.filter((task) => task.done);
  const sortByDueDate = (items) => items.slice().sort((a, b) => (a.due || '').localeCompare(b.due || ''));
  return <>
    <PageHeading eyebrow="A CLEARER HEADSPACE" title="Personal tasks" description="Your plans, reminders, and money chores—all together." action="New task" onAction={onAdd} />
    <div className="summary-grid task-stats"><SummaryCard label="Open tasks" value={String(tasks.filter((task) => !task.done).length)} note="A manageable little list" icon={CheckCheck} tone="green" /><SummaryCard label="Due today" value={String(tasks.filter((task) => !task.done && taskDueState(task.due) === 'today').length)} note="You’ve got this" icon={Flame} tone="peach" /><SummaryCard label="Money tasks" value={String(tasks.filter((task) => task.category === 'Money' && !task.done).length)} note="Bills and savings steps" icon={Wallet} tone="blue" /><SummaryCard label="Completed" value={String(tasks.filter((task) => task.done).length)} note="Every finished task counts" icon={Check} tone="lilac" /></div>
    <div className="task-toolbar"><div><h2>Your list</h2><p>One step at a time is still progress.</p></div><div className="segmented">{['All tasks', 'Personal', 'Money', 'Completed'].map((option) => <button key={option} className={filter === option ? 'selected' : ''} onClick={() => setFilter(option)}>{option}</button>)}</div></div>
    {dueTasks.length === 0 && completed.length === 0 ? <section className="panel empty-task-state"><div className="empty-illustration"><CheckCheck size={25} /></div><h2>Nothing on this list just yet</h2><p>Add a small task and give your day a little shape.</p><button className="button-primary" onClick={onAdd}><Plus size={15} />Add a task</button></section> : <div className="task-board">
      <section className="task-column"><div className="column-heading"><span className="column-dot overdue-dot" /><h3>Overdue</h3><span className="column-count">{overdueTasks.length}</span></div>{sortByDueDate(overdueTasks).map((task) => <TaskCard key={task.id} task={task} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />)}{overdueTasks.length === 0 && <p className="column-empty">Nothing overdue.</p>}</section>
      <section className="task-column"><div className="column-heading"><span className="column-dot today" /><h3>Today</h3><span className="column-count">{todayTasks.length}</span></div>{todayTasks.map((task) => <TaskCard key={task.id} task={task} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />)}{todayTasks.length === 0 && <p className="column-empty">A little breathing room.</p>}</section>
      <section className="task-column"><div className="column-heading"><span className="column-dot upcoming" /><h3>Coming up</h3><span className="column-count">{upcomingTasks.length}</span></div>{sortByDueDate(upcomingTasks).map((task) => <TaskCard key={task.id} task={task} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />)}{upcomingTasks.length === 0 && <p className="column-empty">Nothing else due soon.</p>}</section>
      <section className="task-column"><div className="column-heading"><span className="column-dot completed-dot" /><h3>Done</h3><span className="column-count">{completed.length}</span></div>{completed.map((task) => <TaskCard key={task.id} task={task} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />)}{completed.length === 0 && <p className="column-empty">Your wins will show up here.</p>}</section>
    </div>}
    <div className="task-note"><Sparkles size={15} /><span>Money reminders stay connected to the bill or goal that created them.</span></div>
  </>;
}

function TaskCard({ task, onToggle, onEdit, onDelete }) {
  const overdue = !task.done && taskDueState(task.due) === 'overdue';
  return <motion.article className={`task-card ${task.done ? 'done' : ''} ${overdue ? 'overdue' : ''}`} layout><div className="task-card-top"><button className={`task-check ${task.done ? 'checked' : ''}`} onClick={() => onToggle(task.id)} aria-label={task.done ? `Reopen ${task.title}` : `Complete ${task.title}`}>{task.done && <Check size={12} />}</button><span className={`task-category ${task.category.toLowerCase()}`}>{task.category}</span><div className="task-card-actions"><button className="task-card-action" onClick={() => onEdit(task)} aria-label={`Edit ${task.title}`} title="Edit task"><Pencil size={13} /></button><button className="task-card-action danger" onClick={() => onDelete(task)} aria-label={`Delete ${task.title}`} title="Delete task"><Trash2 size={13} /></button></div></div><h4>{task.title}</h4><div className="task-card-bottom"><span className={`task-date ${overdue ? 'overdue-date' : ''}`}><span className="tiny-calendar">◷</span>{formatTaskDue(task.due)}</span><span className={`task-color ${task.color}`} /></div></motion.article>;
}

function Budgets({ budgets, goals, subscriptions, onAddBudget, onEditBudget, onDeleteBudget, onAddGoal, onEditGoal, onDeleteGoal, onContribute, onAddSubscription, onEditSubscription, onMarkPaid, onRemoveSubscription, onNotify }) {
  const spent = budgets.reduce((sum, budget) => sum + Number(budget.spent || 0), 0);
  const totalLimit = budgets.reduce((sum, budget) => sum + Number(budget.limit || 0), 0);
  const remaining = Math.max(0, totalLimit - spent);
  const monthName = new Intl.DateTimeFormat('en-IN', { month: 'long' }).format(new Date());
  const categoryStyle = {
    'Food & drink': ['sage', Coffee], Transport: ['blue', ArrowRight], Shopping: ['peach', ShoppingBag],
    Subscriptions: ['lilac', CreditCard], Home: ['gold', Landmark], 'Everything else': ['gold', Ellipsis],
  };
  return <>
    <PageHeading eyebrow="MAKE ROOM FOR WHAT MATTERS" title="Budgets & goals" description="Give today a plan. Give tomorrow a possibility." action="New budget" onAction={onAddBudget} />
    <div className="summary-grid"><SummaryCard label="Monthly plan" value={money(totalLimit)} note={`${monthName} across your categories`} icon={Wallet} tone="green" /><SummaryCard label="Spent so far" value={money(spent)} note={totalLimit ? `${Math.round(spent / totalLimit * 100)}% of your monthly plan` : 'Add a budget to begin'} icon={ArrowUpRight} tone="peach" /><SummaryCard label="Left to spend" value={money(remaining)} note="Across your categories" icon={TrendingUp} tone="blue" /><SummaryCard label="Savings goals" value={`${goals.length} active`} note="One little step at a time" icon={Goal} tone="lilac" /></div>
    <div className="dashboard-grid plans-grid"><section className="panel budget-list"><div className="panel-heading"><div><h2>{monthName} budgets</h2><p>A gentle guide, not a guilt trip</p></div><button className="text-button" onClick={onAddBudget}>Set a budget <ArrowRight size={14} /></button></div>{budgets.length ? budgets.map((budget) => { const [color, Icon] = categoryStyle[budget.category] || ['gold', Ellipsis]; const progress = budget.limit ? Math.round((budget.spent / budget.limit) * 100) : 0; return <div className="budget-row" key={budget.id}><span className={`budget-icon ${color}`}><Icon size={16} /></span><div className="budget-content"><div className="budget-line"><strong>{budget.category}</strong><span>{money(budget.spent)} <i>of</i> {money(budget.limit)}</span></div><div className="progress-track"><motion.div className={`progress-fill ${color}`} initial={{ width: 0 }} animate={{ width: `${Math.min(progress, 100)}%` }} transition={{ duration: 0.7 }} /></div></div><span className={`budget-percent ${progress >= 90 ? 'near-limit' : ''}`}>{progress}%</span><div className="plan-actions"><button className="task-card-action" onClick={() => onEditBudget(budget)} aria-label={`Edit ${budget.category} budget`} title="Edit budget"><Pencil size={13} /></button><button className="task-card-action danger" onClick={() => onDeleteBudget(budget)} aria-label={`Delete ${budget.category} budget`} title="Delete budget"><Trash2 size={13} /></button></div></div>; }) : <p className="column-empty">Set a monthly budget to start tracking your spending.</p>}</section>
      <div className="side-column"><section className="panel goals-list"><div className="panel-heading"><div><h2>Savings goals</h2><p>Things you’re looking forward to</p></div><button className="round-add" aria-label="Add a savings goal" onClick={onAddGoal}><Plus size={16} /></button></div>{goals.length ? goals.map((goal) => <GoalCard key={goal.id} goal={goal} onEdit={onEditGoal} onDelete={onDeleteGoal} onContribute={onContribute} />) : <p className="column-empty">Add a goal and give your savings a direction.</p>}</section><section className="panel recurring-panel"><div className="panel-heading"><div><h2>Recurring bills</h2><p>Your upcoming subscriptions</p></div><button className="round-add" aria-label="Add a recurring bill" onClick={onAddSubscription}><Plus size={16} /></button></div>{subscriptions.length ? subscriptions.map((item) => <div className="bill-row" key={item.id}><span className="bill-icon"><Zap size={15} /></span><span className="bill-copy"><strong>{item.name}</strong><small>Renews {formatDate(item.nextDueDate)} · {item.billingCycle}</small></span><strong className="bill-amount">{money(item.amount)}</strong><button className="icon-button bill-action" onClick={() => onMarkPaid(item)} aria-label={`Mark ${item.name} paid`} title="Mark paid"><Check size={14} /></button><button className="icon-button bill-action" onClick={() => onEditSubscription(item)} aria-label={`Edit ${item.name}`} title="Edit"><Pencil size={14} /></button><button className="icon-button bill-action" onClick={() => onRemoveSubscription(item.id)} aria-label={`Remove ${item.name}`} title="Remove"><X size={14} /></button></div>) : <p className="column-empty">Add a recurring bill to keep renewals in view.</p>}</section></div>
    </div>
  </>;
}

function GoalCard({ goal, onEdit, onDelete, onContribute }) {
  const progress = goal.targetAmount ? Math.min(100, Math.round(Number(goal.savedAmount) / Number(goal.targetAmount) * 100)) : 0;
  const targetDate = goal.targetDate ? new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(new Date(`${goal.targetDate}T00:00:00`)) : 'No target date';
  return <div className="goal-card"><div className="goal-info"><div className="goal-emoji">{goal.emoji}</div><div><strong>{goal.title}</strong><small>{money(goal.savedAmount)} <span>of</span> {money(goal.targetAmount)}</small></div><div className="plan-actions"><button className="task-card-action" onClick={() => onEdit(goal)} aria-label={`Edit ${goal.title}`} title="Edit goal"><Pencil size={13} /></button><button className="task-card-action danger" onClick={() => onDelete(goal)} aria-label={`Delete ${goal.title}`} title="Delete goal"><Trash2 size={13} /></button></div></div><div className="progress-track"><motion.div className="progress-fill" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.8 }} /></div><div className="progress-caption"><span>{progress}% there</span><span>Target: {targetDate}</span></div><div className="goal-suggestion"><Sparkles size={13} /><span>Suggested next step</span><strong>{money(Math.max(0, Number(goal.targetAmount) - Number(goal.savedAmount)) / Math.max(1, 12))} / month</strong></div><button className="goal-contribute" onClick={() => onContribute(goal)}><Plus size={13} /> Add savings</button></div>;
}

function QuickModal({ type, previewMode, editingTransaction, editingTask, editingBudget, editingGoal, contributingGoal, editingSubscription, onClose, onAddTask, onUpdateTask, onAddTransaction, onUpdateTransaction, onAddBudget, onUpdateBudget, onAddGoal, onUpdateGoal, onAddGoalContribution, onAddSubscription, onUpdateSubscription }) {
  const [mode, setMode] = useState(type === 'quick' ? '' : type);
  const [name, setName] = useState(editingTransaction?.name || editingTask?.title || editingGoal?.title || editingSubscription?.name || '');
  const [amount, setAmount] = useState(editingTransaction ? String(editingTransaction.amount) : editingBudget ? String(editingBudget.limit) : editingGoal ? String(editingGoal.targetAmount) : editingSubscription ? String(editingSubscription.amount) : '');
  const [due, setDue] = useState(editingTask ? taskDateValue(editingTask.due) || editingTask.due : editingGoal?.targetDate || editingSubscription?.nextDueDate || '');
  const [kind, setKind] = useState(editingTransaction?.kind || 'expense');
  const [category, setCategory] = useState(editingTransaction?.category || editingBudget?.category || 'Food & drink');
  const [taskCategory, setTaskCategory] = useState(editingTask?.category || 'Personal');
  const [emoji, setEmoji] = useState(editingGoal?.emoji || '🌱');
  const [savedAmount, setSavedAmount] = useState(editingGoal ? String(editingGoal.savedAmount) : '0');
  const [billingCycle, setBillingCycle] = useState(editingSubscription?.billingCycle || 'monthly');

  const submit = (event) => {
    event.preventDefault();
    if (mode === 'task' && editingTask) onUpdateTask(name.trim(), due || 'Today', taskCategory, editingTask.id);
    else if (mode === 'task') onAddTask(name.trim(), due || 'Today', taskCategory);
    else if (mode === 'transaction' && editingTransaction) onUpdateTransaction(name.trim(), amount, kind, category, editingTransaction.id);
    else if (mode === 'transaction') onAddTransaction(name.trim(), amount, kind, category);
    else if (mode === 'budget' && editingBudget) onUpdateBudget(category, amount, editingBudget.id);
    else if (mode === 'budget') onAddBudget(category, amount);
    else if (mode === 'goal' && editingGoal) onUpdateGoal(name.trim(), amount, due || null, emoji || '🌱', savedAmount, editingGoal.id);
    else if (mode === 'goal') onAddGoal(name.trim(), amount, due || null, emoji || '🌱');
    else if (mode === 'contribution') onAddGoalContribution(amount, contributingGoal.id);
    else if (mode === 'subscription' && editingSubscription) onUpdateSubscription(name.trim(), amount, billingCycle, due, editingSubscription.id);
    else if (mode === 'subscription') onAddSubscription(name.trim(), amount, billingCycle, due);
  };
  const title = { task: editingTask ? 'Edit task' : 'Add a task', transaction: editingTransaction ? 'Edit transaction' : 'Add a transaction', budget: editingBudget ? 'Edit monthly budget' : 'Set a monthly budget', goal: editingGoal ? 'Edit savings goal' : 'Create a savings goal', contribution: 'Add to your savings', subscription: editingSubscription ? 'Edit recurring bill' : 'Add a recurring bill' };
  const isAmountForm = ['transaction', 'budget', 'goal', 'contribution', 'subscription'].includes(mode);

  return <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <motion.section className="modal" initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.99 }} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-top"><div><div className="eyebrow">A QUICK LITTLE UPDATE</div><h2 id="modal-title">{title[mode] || 'What would you like to add?'}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
      {!mode ? <div className="quick-choices">
        <button onClick={() => setMode('transaction')}><span className="choice-icon peach"><ArrowDownRight size={18} /></span><strong>Transaction</strong><small>Income or expense</small><ArrowRight size={16} /></button>
        <button onClick={() => setMode('task')}><span className="choice-icon sage"><CheckCheck size={18} /></span><strong>Personal task</strong><small>A reminder or to-do</small><ArrowRight size={16} /></button>
      </div> : <form className="modal-form" onSubmit={submit}>
        {!['budget', 'contribution'].includes(mode) && <label>{mode === 'task' ? 'Task name' : mode === 'goal' ? 'Goal name' : mode === 'subscription' ? 'Bill name' : 'Description'}<input autoFocus required value={name} onChange={(event) => setName(event.target.value)} placeholder={mode === 'task' ? 'e.g. Pay electricity bill' : mode === 'goal' ? 'e.g. A new laptop' : mode === 'subscription' ? 'e.g. Internet plan' : 'e.g. Weekly groceries'} /></label>}
        {mode === 'task' && <><div className="field-row"><label>Category<select value={taskCategory} onChange={(event) => setTaskCategory(event.target.value)}><option>Personal</option><option>Money</option></select></label><label>{editingTask && !taskDateValue(editingTask.due) ? 'Due date or reminder' : 'Due date'}<input type={editingTask && !taskDateValue(editingTask.due) ? 'text' : 'date'} value={due} onChange={(event) => setDue(event.target.value)} placeholder={editingTask && !taskDateValue(editingTask.due) ? 'e.g. Oct 20 · 5:30 PM' : undefined} /></label></div><p className="form-hint">Leave blank to make it due today.</p></>}
        {mode === 'transaction' && <><div className="field-row"><label>Amount (INR)<input type="number" min="0.01" step="0.01" required value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" /></label><label>Type<select value={kind} onChange={(event) => setKind(event.target.value)}><option value="expense">Expense</option><option value="income">Income</option></select></label></div><label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option>Food & drink</option><option>Home</option><option>Transport</option><option>Subscriptions</option><option>Education</option><option>Income</option><option>Other</option></select></label></>}
        {mode === 'budget' && <label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option>Food & drink</option><option>Home</option><option>Transport</option><option>Subscriptions</option><option>Education</option><option>Shopping</option><option>Everything else</option></select></label>}
        {mode === 'subscription' && <label>Billing cycle<select value={billingCycle} onChange={(event) => setBillingCycle(event.target.value)}><option value="monthly">Monthly</option><option value="yearly">Yearly</option><option value="weekly">Weekly</option></select></label>}
        {isAmountForm && <label>{mode === 'goal' ? 'Target amount (INR)' : mode === 'budget' ? 'Monthly limit (INR)' : 'Amount (INR)'}<input type="number" min="0.01" step="0.01" required value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" /></label>}
        {mode === 'goal' && <><div className="field-row"><label>Emoji<input value={emoji} onChange={(event) => setEmoji(event.target.value)} maxLength={2} aria-label="Goal emoji" /></label><label>Target date<input type="date" value={due} onChange={(event) => setDue(event.target.value)} /></label></div>{editingGoal && <label>Saved so far (INR)<input type="number" min="0" step="0.01" required value={savedAmount} onChange={(event) => setSavedAmount(event.target.value)} /></label>}</>}
        {mode === 'contribution' && <p className="form-hint">Adding to <strong>{contributingGoal?.title}</strong>. This updates the goal progress.</p>}
        {mode === 'subscription' && <label>Next due date<input type="date" required value={due} onChange={(event) => setDue(event.target.value)} /></label>}
        {isAmountForm && <p className="form-hint">{previewMode ? 'Sample preview only. Changes reset when you refresh.' : 'Saved securely to your Dayflow account.'}</p>}
        <div className="modal-actions"><button type="button" className="button-secondary" onClick={onClose}>Cancel</button><button className="button-primary" type="submit">{['transaction', 'task', 'budget', 'goal', 'subscription'].some((item) => (item === 'transaction' && editingTransaction) || (item === 'task' && editingTask) || (item === 'budget' && editingBudget) || (item === 'goal' && editingGoal) || (item === 'subscription' && editingSubscription)) ? <Check size={15} /> : <Plus size={15} />}{mode === 'task' ? editingTask ? 'Update task' : 'Add task' : mode === 'transaction' ? editingTransaction ? 'Update transaction' : 'Save transaction' : mode === 'budget' ? editingBudget ? 'Update budget' : 'Save budget' : mode === 'goal' ? editingGoal ? 'Update goal' : 'Create goal' : mode === 'contribution' ? 'Add savings' : mode === 'subscription' ? editingSubscription ? 'Update bill' : 'Save recurring bill' : 'Create goal'}</button></div>
      </form>}
    </motion.section>
  </motion.div>;
}

createRoot(document.getElementById('root')).render(<App />);
