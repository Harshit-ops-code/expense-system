import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  CreditCard,
  Users,
  Bell,
  LogOut,
  Plus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  User,
  Settings,
  FileText,
  Eye,
  Edit,
  Trash2,
  Download,
  Upload,
  MoreVertical,
  ChevronDown,
  Calendar,
  Tag,
  MessageCircle,
  Shield,
  PieChart,
  Sparkles,
  Zap,
  Rocket,
  Crown,
  Target,
  Award,
  Star
} from 'lucide-react';

// Use environment variable for API URL, fallback to localhost for development
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Main App Component
const App = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [approvalQueue, setApprovalQueue] = useState([]);
  const [users, setUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    query: '',
    category: '',
    status: '',
    dateFrom: '',
    dateTo: ''
  });
  const [toast, setToast] = useState(null);
  const [showWebsite, setShowWebsite] = useState(true);

  const [loginForm, setLoginForm] = useState({ email: 'admin@company.com', password: 'admin123' });
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    description: '',
    amount: '',
    currency: 'USD',
    category: 'Meals',
    date: new Date().toISOString().split('T')[0],
    tags: []
  });

  // Toast notifications
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // API functions
  const fetchData = async (endpoint, options = {}) => {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });
      return await response.json();
    } catch (error) {
      showToast('Network error', 'error');
      return null;
    }
  };

  // Authentication
  const handleLogin = async (e) => {
    e.preventDefault();
    const result = await fetchData('/auth/login', {
      method: 'POST',
      body: JSON.stringify(loginForm)
    });
    
    if (result?.success) {
      setCurrentUser(result.user);
      showToast(`Welcome back, ${result.user.name}!`);
      loadUserData(result.user);
    } else {
      showToast(result?.error || 'Login failed', 'error');
    }
  };

  // Load user data
  const loadUserData = async (user) => {
    setLoading(true);
    
    // Load dashboard stats
    const statsRes = await fetchData('/dashboard/stats');
    if (statsRes?.success) setDashboardStats(statsRes.stats);

    // Load notifications
    const notifRes = await fetchData(`/notifications/${user.id}`);
    if (notifRes?.success) setNotifications(notifRes.notifications);

    // Role-based data loading
    if (user.role === 'Admin') {
      const [expensesRes, usersRes] = await Promise.all([
        fetchData('/expenses/all'),
        fetchData('/users')
      ]);
      if (expensesRes?.success) setExpenses(expensesRes.expenses);
      if (usersRes?.success) setUsers(usersRes.users);
    }
    
    if (user.role === 'Manager' || user.role === 'Admin') {
      const approvalsRes = await fetchData(`/approvals/${user.id}`);
      if (approvalsRes?.success) setApprovalQueue(approvalsRes.approvals);
    }
    
    if (user.role === 'Employee') {
      const expensesRes = await fetchData(`/expenses/history/${user.id}`);
      if (expensesRes?.success) setExpenses(expensesRes.expenses);
    }
    
    setLoading(false);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setExpenses([]);
    setApprovalQueue([]);
    setNotifications([]);
    setDashboardStats(null);
    setShowWebsite(true);
    showToast('Logged out successfully');
  };

  // Expense management
  const handleSubmitExpense = async (e) => {
    e.preventDefault();
    const result = await fetchData('/expenses', {
      method: 'POST',
      body: JSON.stringify({
        ...expenseForm,
        user_id: currentUser.id,
        amount: parseFloat(expenseForm.amount)
      })
    });

    if (result?.success) {
      setShowExpenseModal(false);
      setExpenseForm({
        title: '',
        description: '',
        amount: '',
        currency: 'USD',
        category: 'Meals',
        date: new Date().toISOString().split('T')[0],
        tags: []
      });
      showToast('Expense submitted for approval!');
      if (result.policy_message) {
        showToast(result.policy_message, 'info');
      }
      loadUserData(currentUser);
    } else {
      showToast(result?.error || 'Submission failed', 'error');
    }
  };

  // Approval actions
  const handleApproval = async (stepId, decision) => {
    const result = await fetchData(`/approvals/${stepId}`, {
      method: 'PUT',
      body: JSON.stringify({ decision })
    });

    if (result?.success) {
      showToast(`Expense ${decision}!`);
      loadUserData(currentUser);
    } else {
      showToast(result?.error || 'Action failed', 'error');
    }
  };

  // Notification management
  const markNotificationRead = async (notificationId) => {
    await fetchData(`/notifications/${notificationId}/read`, { method: 'PUT' });
    setNotifications(prev => prev.map(n => 
      n.id === notificationId ? { ...n, is_read: true } : n
    ));
  };

  // Search functionality
  const handleSearch = async () => {
    const params = new URLSearchParams();
    Object.entries(searchFilters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });

    const result = await fetchData(`/expenses/search?${params}`);
    if (result?.success) {
      setExpenses(result.expenses);
      showToast(`Found ${result.expenses.length} expenses`);
    }
  };

  const clearSearch = async () => {
    setSearchFilters({
      query: '',
      category: '',
      status: '',
      dateFrom: '',
      dateTo: ''
    });
    loadUserData(currentUser);
  };

  // Effects
  useEffect(() => {
    if (currentUser) {
      const interval = setInterval(() => loadUserData(currentUser), 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  // Close notification panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showNotificationPanel && !event.target.closest('.notification-panel') && !event.target.closest('.notification-button')) {
        setShowNotificationPanel(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotificationPanel]);

  // Show website first
  if (showWebsite) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900 to-slate-900"></div>
        
        {/* Floating Elements */}
        <div className="absolute inset-0">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full opacity-40 animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${15 + Math.random() * 10}s`
              }}
            ></div>
          ))}
        </div>

        {/* Header */}
        <header className="relative bg-white/5 backdrop-blur-xl border-b border-white/10 shadow-2xl">
          <div className="container mx-auto px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 rounded-2xl shadow-lg">
                  <Rocket className="h-7 w-7 text-white" />
                </div>
                <div>
                  <span className="text-3xl font-bold bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">
                    ExpensePro
                  </span>
                  <p className="text-xs text-blue-300 font-medium">ENTERPRISE EDITION</p>
                </div>
              </div>
              <button 
                onClick={() => setShowWebsite(false)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-500/25"
              >
                Launch Dashboard 🚀
              </button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative py-24">
          <div className="container mx-auto px-6 text-center">
            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20 mb-8">
              <Sparkles className="h-4 w-4 text-yellow-400" />
              <span className="text-sm font-semibold text-blue-200">AI-POWERED EXPENSE MANAGEMENT</span>
            </div>
            
            <h1 className="text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-white via-blue-200 to-cyan-200 bg-clip-text text-transparent">
                Smart Finance
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Made Beautiful
              </span>
            </h1>
            
            <p className="text-xl lg:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto leading-relaxed">
              Transform your expense workflow with our stunning, AI-driven platform that combines 
              <span className="text-yellow-300 font-semibold"> power </span>
              with 
              <span className="text-cyan-300 font-semibold"> elegance</span>
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <button 
                onClick={() => setShowWebsite(false)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-10 py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 shadow-2xl hover:shadow-blue-500/30 flex items-center space-x-2"
              >
                <Zap className="h-5 w-5" />
                <span>Get Started Free</span>
              </button>
              
              <button className="bg-white/10 backdrop-blur-sm text-white px-10 py-4 rounded-xl font-semibold text-lg border border-white/20 hover:bg-white/20 transition-all duration-300 transform hover:scale-105">
                Watch Demo
              </button>
            </div>

            {/* Feature Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {[
                { icon: Sparkles, title: "AI Analytics", desc: "Smart insights and predictions" },
                { icon: Zap, title: "Lightning Fast", desc: "Real-time processing" },
                { icon: Shield, title: "Bank-Grade Security", desc: "Your data is protected" }
              ].map((feature, index) => (
                <div key={index} className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/10 hover:border-blue-400/30 transition-all duration-300 group">
                  <feature.icon className="h-8 w-8 text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
                  <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-blue-200 text-sm">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="relative bg-black/30 backdrop-blur-xl py-8 text-center border-t border-white/10">
          <p className="text-blue-300">
            &copy; 2024 ExpensePro. The Future of Expense Management is Here
          </p>
        </footer>

        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(180deg); }
          }
          .animate-float {
            animation: float linear infinite;
          }
        `}</style>
      </div>
    );
  }

  // If not showing website and no user, show login screen
  if (!currentUser) {
    return (
      <LoginScreen 
        loginForm={loginForm} 
        setLoginForm={setLoginForm} 
        onLogin={handleLogin}
        onBackToWebsite={() => setShowWebsite(true)}
      />
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      {/* Sidebar */}
      <Sidebar 
        currentUser={currentUser} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        isOpen={sidebarOpen}
        onLogout={handleLogout}
        onNewExpense={() => setShowExpenseModal(true)}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          currentUser={currentUser}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          notifications={notifications}
          showNotificationPanel={showNotificationPanel}
          setShowNotificationPanel={setShowNotificationPanel}
          markNotificationRead={markNotificationRead}
          onNewExpense={() => setShowExpenseModal(true)}
        />
        
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto w-full">
            {/* Tab Content */}
            {activeTab === 'dashboard' && (
              <DashboardView 
                stats={dashboardStats} 
                expenses={expenses} 
                currentUser={currentUser}
                loading={loading}
              />
            )}
            
            {activeTab === 'my-expenses' && (
              <ExpensesView
                expenses={expenses}
                currentUser={currentUser}
                searchFilters={searchFilters}
                setSearchFilters={setSearchFilters}
                onSearch={handleSearch}
                onClear={clearSearch}
                loading={loading}
              />
            )}
            
            {activeTab === 'approvals' && (
              <ApprovalsView
                approvalQueue={approvalQueue}
                currentUser={currentUser}
                onApproval={handleApproval}
                loading={loading}
              />
            )}
            
            {activeTab === 'all-expenses' && (
              <AllExpensesView
                expenses={expenses}
                currentUser={currentUser}
                searchFilters={searchFilters}
                setSearchFilters={setSearchFilters}
                onSearch={handleSearch}
                onClear={clearSearch}
                loading={loading}
              />
            )}
            
            {activeTab === 'users' && (
              <UsersView
                users={users}
                currentUser={currentUser}
                loading={loading}
              />
            )}
          </div>
        </main>
      </div>

      {/* Expense Modal */}
      {showExpenseModal && (
        <ExpenseModal
          expenseForm={expenseForm}
          setExpenseForm={setExpenseForm}
          onSubmit={handleSubmitExpense}
          onClose={() => setShowExpenseModal(false)}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  );
};

// Updated Sidebar Component with New Theme
const Sidebar = ({ currentUser, activeTab, setActiveTab, isOpen, onLogout, onNewExpense }) => {
  if (!currentUser) return null;

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, roles: ['Admin', 'Manager', 'Employee'] },
    { id: 'my-expenses', label: 'My Expenses', icon: CreditCard, roles: ['Employee'] },
    { id: 'approvals', label: 'Approval Queue', icon: CheckCircle, roles: ['Manager', 'Admin'] },
    { id: 'all-expenses', label: 'All Expenses', icon: FileText, roles: ['Admin'] },
    { id: 'users', label: 'User Management', icon: Users, roles: ['Admin'] },
  ];

  const userMenuItems = menuItems.filter(item => 
    item.roles.includes(currentUser.role)
  );

  return (
    <div className={`bg-gradient-to-b from-slate-900 to-blue-900 border-r border-blue-700/50 transition-all duration-300 flex flex-col ${isOpen ? 'w-64' : 'w-20'} shadow-2xl`}>
      {/* Logo */}
      <div className="flex items-center justify-between p-6 border-b border-blue-700/50">
        <div className={`flex items-center space-x-3 ${!isOpen && 'justify-center'}`}>
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-xl shadow-lg">
            <Rocket className="w-6 h-6 text-white" />
          </div>
          {isOpen && (
            <div>
              <h1 className="text-lg font-bold text-white">ExpensePro</h1>
              <p className="text-xs text-blue-300">Enterprise</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Action */}
      {currentUser.role === 'Employee' && isOpen && (
        <div className="p-4 border-b border-blue-700/50">
          <button
            onClick={onNewExpense}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-blue-500/25 flex items-center justify-center space-x-2 font-semibold"
          >
            <Plus className="w-4 h-4" />
            <span>New Expense</span>
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {userMenuItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 ${
              activeTab === item.id
                ? 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-white border border-blue-400/30 shadow-lg'
                : 'text-blue-200 hover:bg-white/10 hover:text-white hover:scale-105'
            }`}
          >
            <item.icon className="w-5 h-5" />
            {isOpen && <span className="font-medium">{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-blue-700/50">
        <div className={`flex items-center space-x-3 ${!isOpen && 'justify-center'}`}>
          <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-sm font-bold text-white">
              {currentUser.name.split(' ').map(n => n[0]).join('')}
            </span>
          </div>
          {isOpen && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {currentUser.name}
              </p>
              <p className="text-xs text-blue-300 capitalize">
                {currentUser.role.toLowerCase()}
              </p>
            </div>
          )}
          <button
            onClick={onLogout}
            className="p-2 text-blue-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Updated Header Component with fixed notification panel
const Header = ({ currentUser, onMenuToggle, notifications, showNotificationPanel, setShowNotificationPanel, markNotificationRead, onNewExpense }) => {
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-lg relative z-40">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuToggle}
            className="p-2 text-blue-600 hover:text-blue-800 transition-colors rounded-xl hover:bg-blue-50 shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          {currentUser && (
            <div>
              <h1 className="text-xl font-bold text-slate-800">
                Welcome back, <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{currentUser.name}</span>!
              </h1>
              <p className="text-sm text-slate-600">
                {currentUser.department} • {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
          )}
        </div>

        {currentUser && (
          <div className="flex items-center space-x-3">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotificationPanel(!showNotificationPanel)}
                className="relative p-2 text-slate-600 hover:text-blue-600 transition-colors rounded-xl hover:bg-blue-50 shadow-sm notification-button"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shadow-lg">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotificationPanel && (
                <div className="absolute right-0 top-full mt-2 w-96 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 z-50 notification-panel">
                  <div className="p-4 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-slate-800">Notifications</h3>
                      <span className="text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-2 py-1 rounded-full">
                        {unreadCount} unread
                      </span>
                    </div>
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">No notifications</p>
                      </div>
                    ) : (
                      notifications.map(notification => (
                        <div
                          key={notification.id}
                          className={`p-4 border-b border-slate-100 hover:bg-blue-50 cursor-pointer transition-all ${
                            !notification.is_read ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : ''
                          }`}
                          onClick={() => markNotificationRead(notification.id)}
                        >
                          <div className="flex items-start space-x-3">
                            <div className={`w-2 h-2 mt-2 rounded-full ${
                              !notification.is_read ? 'bg-blue-500' : 'bg-slate-300'
                            }`} />
                            <div className="flex-1">
                              <p className="font-semibold text-sm text-slate-800">
                                {notification.title}
                              </p>
                              <p className="text-sm text-slate-600 mt-1">
                                {notification.message}
                              </p>
                              <p className="text-xs text-slate-400 mt-2">
                                {new Date(notification.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Action for Employees */}
            {currentUser.role === 'Employee' && (
              <button
                onClick={onNewExpense}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-blue-500/25 flex items-center space-x-2 font-semibold"
              >
                <Plus className="w-4 h-4" />
                <span>New Expense</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

// Updated Dashboard View Component
const DashboardView = ({ stats, expenses, currentUser, loading }) => {
  if (loading) return <LoadingSpinner />;
  if (!stats) return <EmptyState message="No dashboard data available" />;

  const recentExpenses = expenses.slice(0, 5);
  const categoryStats = expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Expenses"
          value={stats.total_expenses}
          change="+12%"
          icon={FileText}
          color="blue"
        />
        <StatCard
          title="Pending Approvals"
          value={stats.pending_approvals}
          change="+3"
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Monthly Total"
          value={`$${stats.monthly_amount?.toLocaleString() || '0'}`}
          change="+8%"
          icon={TrendingUp}
          color="emerald"
        />
        <StatCard
          title="Overdue Approvals"
          value={stats.overdue_approvals || 0}
          change="+2"
          icon={AlertTriangle}
          color="rose"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Expenses */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-800">Recent Expenses</h2>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-semibold">
              View All
            </button>
          </div>
          <div className="space-y-4">
            {recentExpenses.length === 0 ? (
              <EmptyState message="No recent expenses" />
            ) : (
              recentExpenses.map(expense => (
                <ExpenseListItem key={expense.id} expense={expense} />
              ))
            )}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Spending by Category</h2>
          <div className="space-y-4">
            {Object.entries(categoryStats).length === 0 ? (
              <EmptyState message="No category data" />
            ) : (
              Object.entries(categoryStats).map(([category, amount]) => (
                <div key={category} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-white/50 hover:bg-blue-50 transition-all">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Tag className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-semibold text-slate-800">{category}</span>
                  </div>
                  <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    ${amount.toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Expenses View Component
const ExpensesView = ({ expenses, currentUser, searchFilters, setSearchFilters, onSearch, onClear, loading }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Expenses</h1>
          <p className="text-slate-600">Manage and track your expense submissions</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-600">
            {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
          </p>
          <p className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            ${expenses.reduce((sum, exp) => sum + exp.amount, 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Apply similar styling to SearchFilters and ExpenseListView */}
      <SearchFilters
        filters={searchFilters}
        setFilters={setSearchFilters}
        onSearch={onSearch}
        onClear={onClear}
      />

      {loading ? (
        <LoadingSpinner />
      ) : (
        <ExpenseListView
          expenses={expenses}
          currentUser={currentUser}
          showActions={true}
        />
      )}
    </div>
  );
};

// Approvals View Component
const ApprovalsView = ({ approvalQueue, currentUser, onApproval, loading }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Approval Queue</h1>
          <p className="text-slate-600">Review and approve pending expenses</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-600">
            {approvalQueue.length} pending approval{approvalQueue.length !== 1 ? 's' : ''}
          </p>
          <div className="inline-flex items-center space-x-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
            <Clock className="w-4 h-4" />
            <span>Action Required</span>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : approvalQueue.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 p-12 text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">All Caught Up! 🎉</h3>
          <p className="text-slate-600 mb-4">No pending approvals at the moment</p>
          <p className="text-sm text-slate-500">Expenses awaiting approval will appear here</p>
        </div>
      ) : (
        <div className="space-y-6">
          {approvalQueue.map(expense => (
            <ApprovalExpenseCard
              key={expense.id}
              expense={expense}
              currentUser={currentUser}
              onApproval={onApproval}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// All Expenses View Component
const AllExpensesView = ({ expenses, currentUser, searchFilters, setSearchFilters, onSearch, onClear, loading }) => {
  const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">All Expenses</h1>
          <p className="text-slate-600">View and manage all company expenses</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-600">
            {expenses.length} total expense{expenses.length !== 1 ? 's' : ''}
          </p>
          <p className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            ${totalAmount.toLocaleString()}
          </p>
        </div>
      </div>

      <SearchFilters
        filters={searchFilters}
        setFilters={setSearchFilters}
        onSearch={onSearch}
        onClear={onClear}
      />

      {loading ? (
        <LoadingSpinner />
      ) : (
        <ExpenseListView
          expenses={expenses}
          currentUser={currentUser}
          showActions={false}
        />
      )}
    </div>
  );
};

// Users View Component
const UsersView = ({ users, currentUser, loading }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
          <p className="text-slate-600">Manage users and permissions</p>
        </div>
        <button className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-blue-500/25 flex items-center space-x-2 font-semibold">
          <Plus className="w-4 h-4" />
          <span>Add User</span>
        </button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-blue-50/50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <span className="text-sm font-bold text-white">
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-slate-800">{user.name}</div>
                          <div className="text-sm text-slate-600">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                        user.role === 'Admin' ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg' :
                        user.role === 'Manager' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg' :
                        'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-800">
                      {user.department}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                        user.is_active ? 
                        'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg' : 
                        'bg-gradient-to-r from-slate-500 to-slate-600 text-white shadow-lg'
                      }`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button className="text-blue-600 hover:text-blue-800 font-semibold hover:scale-110 transition-transform p-2">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="text-rose-600 hover:text-rose-800 font-semibold hover:scale-110 transition-transform p-2">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// Search Filters Component
const SearchFilters = ({ filters, setFilters, onSearch, onClear }) => {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-800">Search Expenses</h3>
        <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
          <Search className="w-4 h-4 text-white" />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Search</label>
          <input
            type="text"
            placeholder="Search expenses..."
            value={filters.query}
            onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 transition-all duration-300 hover:border-blue-300"
          />
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Category</label>
          <select
            value={filters.category}
            onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 transition-all duration-300 hover:border-blue-300"
          >
            <option value="">All Categories</option>
            <option value="Meals">Meals</option>
            <option value="Travel">Travel</option>
            <option value="Software">Software</option>
            <option value="Equipment">Equipment</option>
            <option value="Office Supplies">Office Supplies</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 transition-all duration-300 hover:border-blue-300"
          >
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">From Date</label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 transition-all duration-300 hover:border-blue-300"
          />
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">To Date</label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 transition-all duration-300 hover:border-blue-300"
          />
        </div>
      </div>
      
      <div className="flex space-x-3 mt-6">
        <button
          onClick={onSearch}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-blue-500/25 flex items-center space-x-2 font-semibold"
        >
          <Search className="w-4 h-4" />
          <span>Search</span>
        </button>
        <button
          onClick={onClear}
          className="bg-gradient-to-r from-slate-500 to-slate-600 text-white px-6 py-3 rounded-xl hover:from-slate-600 hover:to-slate-700 transition-all transform hover:scale-105 shadow-lg flex items-center space-x-2 font-semibold"
        >
          <Filter className="w-4 h-4" />
          <span>Clear</span>
        </button>
      </div>
    </div>
  );
};

// Expense List View Component
const ExpenseListView = ({ expenses, currentUser, showActions }) => {
  if (expenses.length === 0) {
    return (
      <EmptyState 
        icon={FileText}
        message="No expenses found"
        description="Try adjusting your search filters"
      />
    );
  }

  return (
    <div className="space-y-4">
      {expenses.map(expense => (
        <ExpenseCard
          key={expense.id}
          expense={expense}
          currentUser={currentUser}
          showActions={showActions}
        />
      ))}
    </div>
  );
};

// Expense Card Component
const ExpenseCard = ({ expense, currentUser, showActions }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved': return 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-emerald-500 shadow-lg';
      case 'Rejected': return 'bg-gradient-to-r from-rose-500 to-pink-500 text-white border-rose-500 shadow-lg';
      case 'Pending': return 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-500 shadow-lg';
      default: return 'bg-gradient-to-r from-slate-500 to-slate-600 text-white border-slate-500 shadow-lg';
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'Meals': '🍽️',
      'Travel': '✈️',
      'Software': '💻',
      'Equipment': '🖥️',
      'Office Supplies': '📦',
      'Other': '📌'
    };
    return icons[category] || '📌';
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-start space-x-4">
          <div className="text-3xl mt-1">{getCategoryIcon(expense.category)}</div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-800">{expense.title}</h3>
            <p className="text-sm text-slate-600 mt-1">
              By {expense.submitter_name} • {expense.submitter_department} • {new Date(expense.date).toLocaleDateString()}
            </p>
            {expense.description && (
              <p className="text-slate-700 mt-2">{expense.description}</p>
            )}
            {expense.tags && expense.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {expense.tags.map(tag => (
                  <span key={tag} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs px-3 py-1 rounded-full border border-blue-400 shadow-sm">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            ${expense.amount} {expense.currency}
          </p>
          <span className={`inline-block px-4 py-2 rounded-full text-sm font-bold border ${getStatusColor(expense.status)}`}>
            {expense.status}
          </span>
        </div>
      </div>

      {/* Approval Steps */}
      {expense.approval_steps && expense.approval_steps.length > 0 && (
        <div className="border-t border-slate-200 pt-4 mt-4">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Approval Flow</h4>
          <div className="space-y-3">
            {expense.approval_steps.map((step) => (
              <div key={step.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-lg ${
                    step.status === 'Approved' ? 'bg-gradient-to-r from-emerald-500 to-teal-500' :
                    step.status === 'Rejected' ? 'bg-gradient-to-r from-rose-500 to-pink-500' :
                    step.status === 'Waiting' ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-slate-500 to-slate-600'
                  }`}>
                    {step.status === 'Approved' ? '✓' :
                     step.status === 'Rejected' ? '✗' :
                     step.status === 'Waiting' ? '...' : '—'}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800">{step.approver_name}</span>
                    <span className="text-slate-500 ml-2">
                      ({step.sequence === 1 ? 'Manager' : 'Admin'})
                    </span>
                    {step.is_overdue && (
                      <span className="ml-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white px-2 py-1 rounded-full text-xs font-bold">Overdue</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(step.status)}`}>
                    {step.status}
                  </span>
                  {step.comments && (
                    <p className="text-xs text-slate-600 mt-1">"{step.comments}"</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {showActions && (
        <div className="border-t border-slate-200 pt-4 mt-4">
          <div className="flex space-x-3">
            <button className="flex-1 px-4 py-3 border-2 border-slate-200 text-slate-700 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all flex items-center justify-center space-x-2 font-semibold">
              <Eye className="w-4 h-4" />
              <span>View Details</span>
            </button>
            <button className="flex-1 px-4 py-3 border-2 border-slate-200 text-slate-700 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all flex items-center justify-center space-x-2 font-semibold">
              <Edit className="w-4 h-4" />
              <span>Edit</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Approval Expense Card Component
const ApprovalExpenseCard = ({ expense, currentUser, onApproval }) => {
  const userStep = expense.approval_steps?.find(
    step => step.approver_id === currentUser.id && step.status === 'Waiting'
  );

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border-2 border-blue-300 p-6 hover:shadow-xl transition-all duration-300">
      <ExpenseCard expense={expense} currentUser={currentUser} showActions={false} />
      
      {userStep && (
        <div className="border-t border-slate-200 pt-6 mt-6">
          <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-xl p-4 mb-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <p className="text-sm font-semibold text-slate-800">Your approval required</p>
            </div>
            {userStep.due_date && new Date(userStep.due_date) < new Date() && (
              <p className="text-xs text-rose-600 mt-1 font-semibold">
                ⚠️ This approval is overdue!
              </p>
            )}
          </div>
          
          <div className="flex space-x-4">
            <button
              onClick={() => onApproval(userStep.id, 'rejected')}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl hover:from-rose-600 hover:to-pink-600 transition-all transform hover:scale-105 shadow-lg hover:shadow-rose-500/25 flex items-center justify-center space-x-3 font-bold text-lg"
            >
              <XCircle className="w-6 h-6" />
              <span>Reject</span>
            </button>
            <button
              onClick={() => onApproval(userStep.id, 'approved')}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all transform hover:scale-105 shadow-lg hover:shadow-emerald-500/25 flex items-center justify-center space-x-3 font-bold text-lg"
            >
              <CheckCircle className="w-6 h-6" />
              <span>Approve</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Expense Modal Component
const ExpenseModal = ({ expenseForm, setExpenseForm, onSubmit, onClose }) => {
  const categories = ['Meals', 'Travel', 'Software', 'Equipment', 'Office Supplies', 'Other'];
  const commonTags = ['client', 'business', 'conference', 'team', 'urgent', 'equipment'];

  const addTag = (tag) => {
    if (!expenseForm.tags.includes(tag)) {
      setExpenseForm(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
  };

  const removeTag = (tagToRemove) => {
    setExpenseForm(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Submit New Expense</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={expenseForm.title}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                placeholder="Enter expense title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount *
              </label>
              <input
                type="number"
                step="0.01"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                value={expenseForm.category}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date *
              </label>
              <input
                type="date"
                value={expenseForm.date}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={expenseForm.description}
              onChange={(e) => setExpenseForm(prev => ({ ...prev, description: e.target.value }))}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Provide details about this expense..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {expenseForm.tags.map(tag => (
                <span
                  key={tag}
                  className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center border border-blue-200"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {commonTags.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addTag(tag)}
                  className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm hover:bg-gray-200 transition-colors border border-gray-300"
                >
                  + #{tag}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <Shield className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-semibold text-blue-800">Dual Approval Required</p>
                <p className="text-sm text-blue-600 mt-1">
                  This expense will require approval from both Manager and Administrator
                </p>
              </div>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Submit for Approval
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Updated Stat Card Component
const StatCard = ({ title, value, change, icon: Icon, color }) => {
  const colorClasses = {
    purple: 'from-purple-500 to-pink-500',
    emerald: 'from-emerald-500 to-teal-500',
    amber: 'from-amber-500 to-orange-500',
    rose: 'from-rose-500 to-pink-500',
    blue: 'from-blue-600 to-indigo-600'
  };

  const changeColors = {
    purple: 'text-blue-600',
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
    rose: 'text-rose-600',
    blue: 'text-blue-600'
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-600">{title}</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
          <p className={`text-sm font-semibold mt-1 ${changeColors[color]}`}>{change}</p>
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-r ${colorClasses[color]} shadow-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
};

// Updated Expense List Item Component
const ExpenseListItem = ({ expense }) => {
  const statusConfig = {
    approved: { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle },
    pending: { color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Clock },
    rejected: { color: 'bg-rose-100 text-rose-800 border-rose-200', icon: XCircle },
  };

  const { color, icon: StatusIcon } = statusConfig[expense.status] || statusConfig.pending;

  return (
    <div className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-white/50 hover:border-blue-300 hover:bg-blue-50 transition-all duration-300 group">
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
          <CreditCard className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="font-semibold text-slate-800">{expense.title}</p>
          <p className="text-sm text-slate-600 capitalize">{expense.category} • {new Date(expense.date).toLocaleDateString()}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-bold text-slate-800">${expense.amount}</p>
        <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-semibold border ${color}`}>
          <StatusIcon className="w-4 h-4" />
          <span className="capitalize">{expense.status}</span>
        </span>
      </div>
    </div>
  );
};

// Updated Loading Spinner Component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-12">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

// Updated Empty State Component
const EmptyState = ({ icon: Icon, message, description }) => (
  <div className="text-center py-12">
    {Icon && <Icon className="w-16 h-16 text-slate-300 mx-auto mb-4" />}
    <h3 className="text-lg font-semibold text-slate-800 mb-2">{message}</h3>
    {description && <p className="text-slate-600">{description}</p>}
  </div>
);

// Updated Toast Component
const Toast = ({ message, type, onClose }) => {
  const typeStyles = {
    success: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg',
    error: 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg',
    info: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg',
    warning: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
  };

  return (
    <div className={`fixed top-4 right-4 px-6 py-4 rounded-xl ${typeStyles[type]} animate-in slide-in-from-right-full duration-500 backdrop-blur-sm z-50`}>
      <div className="flex items-center space-x-3">
        <span className="font-semibold">{message}</span>
        <button onClick={onClose} className="text-white hover:text-slate-200 font-bold">
          ×
        </button>
      </div>
    </div>
  );
};

// Login Screen Component
const LoginScreen = ({ loginForm, setLoginForm, onLogin, onBackToWebsite }) => {
  const demoUsers = [
    { email: 'admin@company.com', password: 'admin123', role: 'Admin', name: 'System Administrator' },
    { email: 'manager@company.com', password: 'manager123', role: 'Manager', name: 'John Manager' },
    { email: 'employee@company.com', password: 'emp123', role: 'Employee', name: 'Mike Johnson' },
  ];

  const fillDemoCredentials = (email, password) => {
    setLoginForm({ email, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden">
      {/* Back Button */}
      <button 
        onClick={onBackToWebsite}
        className="absolute top-6 left-6 z-10 flex items-center text-white hover:text-blue-300 transition-colors bg-white/10 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/20"
      >
        <ChevronDown className="h-4 w-4 rotate-90 mr-2" />
        Back to Website
      </button>

      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-600 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4000"></div>
      </div>

      {/* Floating Elements */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full opacity-30 animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${10 + Math.random() * 10}s`
            }}
          ></div>
        ))}
      </div>

      <div className="max-w-6xl w-full mx-4">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
          <div className="flex flex-col lg:flex-row">
            {/* Left Side - Visual */}
            <div className="lg:w-1/2 p-12 flex flex-col justify-center relative">
              <div className="text-center lg:text-left">
                <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20 mb-8">
                  <Sparkles className="h-4 w-4 text-yellow-400" />
                  <span className="text-sm font-semibold text-blue-200">ENTERPRISE READY</span>
                </div>

                <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                  <span className="bg-gradient-to-r from-white via-blue-200 to-cyan-200 bg-clip-text text-transparent">
                    Welcome
                  </span>
                  <br />
                  <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                    Back
                  </span>
                </h1>
                
                <p className="text-xl text-blue-100 mb-8 leading-relaxed">
                  Sign in to access your enterprise expense management dashboard with 
                  <span className="text-yellow-300 font-semibold"> AI-powered insights </span>
                  and 
                  <span className="text-cyan-300 font-semibold"> stunning visuals</span>.
                </p>
                
                <div className="flex items-center justify-center lg:justify-start space-x-6 text-blue-200">
                  <div className="flex items-center space-x-2">
                    <Zap className="h-5 w-5 text-yellow-400" />
                    <span>Lightning Fast</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Shield className="h-5 w-5 text-green-400" />
                    <span>Secure</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="lg:w-1/2 bg-white/95 backdrop-blur-sm p-12">
              <div className="max-w-md mx-auto">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Rocket className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-slate-800 mb-2">Welcome Back</h2>
                  <p className="text-slate-600">Sign in to your enterprise dashboard</p>
                </div>

                <form className="space-y-6" onSubmit={onLogin}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Email Address
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        </div>
                        <input
                          type="email"
                          value={loginForm.email}
                          onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                          className="block w-full pl-10 pr-4 py-4 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 transition-all duration-300 hover:border-blue-300"
                          placeholder="Enter your email"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Password
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Shield className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        </div>
                        <input
                          type="password"
                          value={loginForm.password}
                          onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                          className="block w-full pl-10 pr-4 py-4 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 transition-all duration-300 hover:border-blue-300"
                          placeholder="Enter your password"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        id="remember-me"
                        name="remember-me"
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                      />
                      <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-700">
                        Remember me
                      </label>
                    </div>

                    <a href="#" className="text-sm font-semibold text-blue-600 hover:text-blue-500 transition-colors">
                      Forgot password?
                    </a>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-blue-500/30 transform hover:scale-105 transition-all duration-300 font-bold text-lg shadow-xl hover:shadow-2xl hover:shadow-blue-500/25"
                  >
                    Sign In 🚀
                  </button>
                </form>

                {/* Demo Accounts */}
                <div className="mt-8 pt-6 border-t border-slate-200">
                  <h3 className="text-sm font-bold text-slate-800 mb-4 text-center">
                    🎯 Quick Demo Access
                  </h3>
                  <div className="space-y-3">
                    {demoUsers.map((user, index) => (
                      <button
                        key={index}
                        onClick={() => fillDemoCredentials(user.email, user.password)}
                        className="w-full text-left p-4 border-2 border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 hover:shadow-md transition-all duration-300 group transform hover:-translate-y-0.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${
                              user.role === 'Admin' ? 'bg-gradient-to-r from-rose-500 to-pink-500' :
                              user.role === 'Manager' ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 
                              'bg-gradient-to-r from-emerald-500 to-teal-500'
                            } shadow-lg`}></div>
                            <div>
                              <div className="font-bold text-slate-800 group-hover:text-blue-700">
                                {user.role}
                              </div>
                              <div className="text-sm text-slate-600">
                                {user.email}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-600">
                              {user.password}
                            </div>
                            <div className="text-xs text-slate-400 mt-1">{user.name}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-6 text-center">
                  <p className="text-xs text-slate-500">
                    Secure • Enterprise • AI-Powered
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        .animate-float {
          animation: float linear infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }                                                                     
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default App;