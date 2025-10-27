import React, { useState, useEffect, useMemo, useRef } from 'react';
import { HashRouter, Routes, Route, Link, useNavigate, useParams, Outlet, Navigate } from 'react-router-dom';
import { AppContextProvider, useAuth, useData, useTheme, useFilters } from './contexts';
import { useTranslation } from './i18n';
import type { Customer, Payment, Area, DuePayment, Bill } from './types';
import { ConnectionStatus, BillStatus } from './types';
import { AddUserIcon, ArrowLeftIcon, Button, Card, CustomersIcon, Header, HomeIcon, Input, Modal, ReportIcon, SettingsIcon, BottomNav, PencilIcon, TrashIcon, CalculatorIcon, Calculator, MapPinIcon, SearchIcon, Select, UserIcon, CameraIcon, BellIcon, CurrencyDollarIcon, ExclamationCircleIcon, DishIcon, ConfirmModal, CalendarIcon, StarIcon, TelegramIcon } from './components';

// --- UTILITY HOOK for Subscription Logic ---
const useSubscriptionStatus = () => {
    const { user } = useAuth();

    const status = user?.subscriptionStatus?.trim().toLowerCase() || 'free_trial';
    const isSubscribed = status === 'active';
    const isPending = status === 'pending';
    
    const trialEndDate = useMemo(() => user?.trialEndDate ? new Date(user.trialEndDate) : null, [user]);

    const trialDaysLeft = useMemo(() => {
        if (!trialEndDate) return 0;
        const diffTime = trialEndDate.getTime() - new Date().getTime();
        return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }, [trialEndDate]);

    const isTrialActive = status === 'free_trial' && trialDaysLeft > 0;
    const isLocked = !isSubscribed && !isTrialActive && !isPending;
    
    return {
        status,
        isSubscribed,
        isTrialActive,
        isPending,
        trialDaysLeft,
        isLocked
    };
};

// --- SCREENS ---

const SplashScreen: React.FC = () => {
    const { t } = useTranslation();
    return (
        <div className="flex flex-col justify-center items-center h-screen bg-gradient-to-br from-indigo-600 to-purple-700 text-white overflow-hidden">
            <div className="splash-logo-animation">
                <DishIcon className="text-white" />
            </div>
            <h1 className="text-3xl font-bold mt-4 splash-text-animation">
                {t('appName')}
            </h1>
        </div>
    );
};


type AuthFormState = 'login' | 'register' | 'forgot';

const AuthHeader: React.FC<{ formState: AuthFormState }> = ({ formState }) => {
    const { t } = useTranslation();

    const title = formState === 'login' ? t('authWelcomeTitle') : t('authRegisterTitle');
    const subtitle = formState === 'login' ? t('authWelcomeSubtitle') : t('authRegisterSubtitle');
    
    return (
        <div className="text-center">
            <div className="mx-auto h-16 w-16 flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/50 rounded-full">
                 <DishIcon className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
                {title}
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {subtitle}
            </p>
        </div>
    );
};

const AuthScreen: React.FC = () => {
    const [formState, setFormState] = useState<AuthFormState>('login');
    const { t } = useTranslation();

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-800 bg-gradient-to-br from-gray-50 to-gray-200 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
            <Card className="max-w-md w-full space-y-8 p-8">
                {formState === 'forgot' ? (
                     <div>
                        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
                            {t('forgotPasswordTitle')}
                        </h2>
                    </div>
                ) : (
                    <AuthHeader formState={formState} />
                )}

                {formState === 'login' && <LoginForm setFormState={setFormState} />}
                {formState === 'register' && <RegisterForm setFormState={setFormState} />}
                {formState === 'forgot' && <ForgotPasswordForm setFormState={setFormState} />}

                <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                     {formState === 'login' && (
                        <p>
                            {t('dontHaveAccount')}{' '}
                            <button onClick={() => setFormState('register')} className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
                                {t('register')}
                            </button>
                        </p>
                    )}
                    {formState === 'register' && (
                        <p>
                            {t('alreadyHaveAccount')}{' '}
                            <button onClick={() => setFormState('login')} className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
                                {t('login')}
                            </button>
                        </p>
                    )}
                </div>
            </Card>
        </div>
    );
};


const LoginForm: React.FC<{ setFormState: (state: AuthFormState) => void }> = ({ setFormState }) => {
    const [emailOrPhone, setEmailOrPhone] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        const success = await login(emailOrPhone, password);
        setIsLoading(false);
        if (success) {
            navigate('/');
        } else {
            setError(t('loginFailed'));
        }
    };

    return (
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && <p className="text-red-500 text-center">{error}</p>}
            <div className="rounded-md shadow-sm -space-y-px flex flex-col gap-4">
                <Input id="login-email" label={t('emailOrPhone')} type="text" value={emailOrPhone} onChange={e => setEmailOrPhone(e.target.value)} required />
                <Input id="login-password" label={t('password')} type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <div className="flex items-center justify-end">
                <div className="text-sm">
                    <button
                        type="button"
                        onClick={() => setFormState('forgot')}
                        className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                    >
                        {t('forgotPassword')}
                    </button>
                </div>
            </div>
            <Button type="submit" isLoading={isLoading}>{t('login')}</Button>
        </form>
    );
};

const RegisterForm: React.FC<{ setFormState: (state: AuthFormState) => void }> = ({ setFormState }) => {
    const [fullName, setFullName] = useState('');
    const [emailOrPhone, setEmailOrPhone] = useState('');
    const [password, setPassword] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        const success = await register({ fullName, emailOrPhone, companyName }, password);
        setIsLoading(false);
        if (success) {
            setMessage(t('signupSuccess'));
            setTimeout(() => navigate('/'), 2000);
        }
    };

    return (
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
             {message && <p className="text-green-500 text-center">{message}</p>}
            <div className="rounded-md shadow-sm -space-y-px flex flex-col gap-4">
                <Input id="reg-name" label={t('fullName')} type="text" value={fullName} onChange={e => setFullName(e.target.value)} required />
                <Input id="reg-email" label={t('emailOrPhone')} type="text" value={emailOrPhone} onChange={e => setEmailOrPhone(e.target.value)} required />
                <Input id="reg-password" label={t('password')} type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                <Input id="reg-company" label={t('companyName')} type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} required />
            </div>
            <Button type="submit" isLoading={isLoading}>{t('register')}</Button>
        </form>
    );
};

const ForgotPasswordForm: React.FC<{ setFormState: (state: AuthFormState) => void }> = ({ setFormState }) => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { forgotPassword } = useAuth();
    const { t } = useTranslation();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);
        const result = await forgotPassword(email);
        setLoading(false);
        if (result.success) {
            setMessage(t('resetEmailSent'));
        } else {
            if (result.code === 'auth/user-not-found') {
                setError(t('userNotFound'));
            } else {
                setError(t('forgotPasswordError'));
            }
        }
    };
    
    return (
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">{t('forgotPasswordInstructions')}</p>
            {message && <p className="text-green-500 text-center">{message}</p>}
            {error && <p className="text-red-500 text-center">{error}</p>}
            <Input id="forgot-email" label={t('emailOrPhone')} type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            <Button type="submit" isLoading={loading}>
                {loading ? `${t('loading')}` : t('sendResetLink')}
            </Button>
            <div className="text-center mt-4">
                <button type="button" onClick={() => setFormState('login')} className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
                    {t('backToLogin')}
                </button>
            </div>
        </form>
    );
};

const LiveDate: React.FC = () => {
    const { language } = useTranslation();
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentDate(new Date());
        }, 60000); // Update every minute
        return () => clearInterval(timer);
    }, []);

    const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    const formattedDate = currentDate.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', options);

    return (
        <div className="mt-4 bg-white/20 backdrop-blur-sm rounded-lg p-2 px-4 inline-flex items-center space-x-2 shadow">
            <CalendarIcon className="w-5 h-5 text-white" />
            <span className="font-semibold text-sm text-white">{formattedDate}</span>
        </div>
    );
};

const SubscriptionModal: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const handleSubscribe = () => {
        onClose();
        navigate('/subscription');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('featureLocked')}>
            <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                    <StarIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                </div>
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white" id="modal-title">
                    {t('trialExpiredTitle')}
                </h3>
                <div className="mt-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('trialExpiredMessage')}
                    </p>
                </div>
                <div className="mt-4">
                    <Button onClick={handleSubscribe}>
                        {t('subscribeNow')}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

const TrialStatusBanner: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { isTrialActive, trialDaysLeft, isLocked, isPending } = useSubscriptionStatus();

    if (isPending) {
        return (
            <div className="p-4 rounded-lg border-l-4 bg-blue-100 dark:bg-blue-900/50 border-blue-500 mb-4">
                <p className="font-bold text-blue-700 dark:text-blue-200">{t('homeVerificationPending')}</p>
                <p className="text-sm text-blue-700 dark:text-blue-200">{t('homeVerificationPendingSub')}</p>
            </div>
        );
    }
    
    if (isTrialActive) {
        return (
            <div className="p-4 rounded-lg border-l-4 bg-yellow-100 dark:bg-yellow-900/50 border-yellow-500 mb-4">
                 <p className="font-bold text-yellow-700 dark:text-yellow-200">{t('yourTrialEndsIn')}</p>
                 <p className="text-sm text-yellow-700 dark:text-yellow-200">
                     {trialDaysLeft} {trialDaysLeft > 1 ? t('days') : t('day')}
                 </p>
            </div>
        );
    }

    if (isLocked) {
        return (
            <div className="p-4 rounded-lg border-l-4 bg-red-100 dark:bg-red-900/50 border-red-500 mb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-bold text-red-700 dark:text-red-200">{t('yourTrialHasExpired')}</p>
                    </div>
                    <button onClick={() => navigate('/subscription')} className="bg-red-600 text-white hover:bg-red-700 px-4 py-2 text-sm font-semibold rounded-md shadow-sm">
                        {t('upgrade')}
                    </button>
                </div>
            </div>
        );
    }

    return null;
};

const HomeScreen: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { customers, payments, bills } = useData();
    const navigate = useNavigate();
    const { isLocked } = useSubscriptionStatus();
    const [isModalOpen, setIsModalOpen] = useState(false);

    const totalDue = useMemo(() => {
        const totalMonthlyDue = bills
            .filter(b => b.status === BillStatus.UNPAID)
            .reduce((sum, bill) => sum + bill.amount, 0);
        const totalOpeningDue = customers.reduce((sum, customer) => sum + customer.openingDue, 0);
        return totalMonthlyDue + totalOpeningDue;
    }, [bills, customers]);

    const totalCollectionThisMonth = useMemo(() => payments
        .filter(p => new Date(p.date).getMonth() === new Date().getMonth() && new Date(p.date).getFullYear() === new Date().getFullYear())
        .reduce((acc, p) => acc + p.amount, 0), [payments]);

    const menuItems = [
        { title: t('addCustomer'), path: '/customers/add', icon: <AddUserIcon />, locked: true },
        { title: t('customerList'), path: '/customers', icon: <CustomersIcon />, locked: true },
        { title: t('addAreaMoholla'), path: '/areas', icon: <MapPinIcon />, locked: false },
        { title: t('paymentHistory'), path: '/reports/history', icon: <ReportIcon/>, locked: true },
        { title: t('searchByName'), path: '/customers', icon: <SearchIcon/>, locked: true },
        { title: t('smsCallReminder'), path: '/reminders', icon: <BellIcon />, locked: true },
    ];

    const handleFeatureClick = (e: React.MouseEvent, item: typeof menuItems[0]) => {
        if (item.locked && isLocked) {
            e.preventDefault();
            setIsModalOpen(true);
        }
    };

    return (
        <>
            <div className="relative bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-b-3xl shadow-lg text-white">
                <Link to="/settings" className="absolute top-4 right-4 p-2" aria-label={t('settings')}>
                    <SettingsIcon className="w-6 h-6 text-white" />
                </Link>
                <h1 className="text-2xl font-bold">{user?.companyName}</h1>
                <p className="text-sm opacity-90">{t('proprietor')}: {user?.fullName}</p>
                <LiveDate />
            </div>

            <main className="p-4">
                 <TrialStatusBanner />
                {/* Dashboard Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card className="flex items-center space-x-4">
                        <CustomersIcon className="w-10 h-10 text-blue-500"/>
                        <div>
                            <p className="text-gray-500 dark:text-gray-400">{t('totalCustomers')}</p>
                            <p className="text-2xl font-bold">{customers.length}</p>
                        </div>
                    </Card>
                    <Card className="flex items-center space-x-4">
                        <ExclamationCircleIcon className="w-10 h-10 text-red-500"/>
                        <div>
                            <p className="text-gray-500 dark:text-gray-400">{t('totalDue')}</p>
                            <p className="text-2xl font-bold">{totalDue.toFixed(2)}</p>
                        </div>
                    </Card>
                     <Card className="flex items-center space-x-4 col-span-1 md:col-span-3">
                        <CurrencyDollarIcon className="w-10 h-10 text-green-500"/>
                        <div>
                            <p className="text-gray-500 dark:text-gray-400">{t('collectionThisMonth')}</p>
                            <p className="text-2xl font-bold">{totalCollectionThisMonth.toFixed(2)}</p>
                        </div>
                    </Card>
                </div>

                {/* Menu Items */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {menuItems.map(item => (
                        <Link to={item.path} key={item.title} onClick={(e) => handleFeatureClick(e, item)}>
                            <Card className="flex flex-col items-center justify-center text-center p-4 h-32 transition-transform transform hover:scale-105 active:scale-95">
                                <div className="text-indigo-500 dark:text-indigo-400 mb-2">{React.cloneElement(item.icon, { className: 'w-8 h-8' })}</div>
                                <h3 className="font-semibold text-gray-700 dark:text-gray-200">{item.title}</h3>
                            </Card>
                        </Link>
                    ))}
                </div>
                 <SubscriptionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
            </main>
        </>
    );
};

const CustomerForm: React.FC<{ customer?: Customer, onSave: () => void }> = ({ customer, onSave }) => {
    const { addCustomer, updateCustomer, areas } = useData();
    const { t } = useTranslation();
    
    // State for all form fields
    const [name, setName] = useState(customer?.name || '');
    const [phone, setPhone] = useState(customer?.phone || '');
    const [area, setArea] = useState(customer?.area || '');
    const [monthlyBill, setMonthlyBill] = useState(customer ? String(customer.monthlyBill) : '');
    const [status, setStatus] = useState(customer?.connectionStatus || ConnectionStatus.ACTIVE);
    const [startDate, setStartDate] = useState(customer?.startDate ? customer.startDate.split('T')[0] : new Date().toISOString().split('T')[0]);
    const [openingDue, setOpeningDue] = useState(customer ? String(customer.openingDue) : '');
    const [reactivationDate, setReactivationDate] = useState(customer?.reactivationDate ? customer.reactivationDate.split('T')[0] : '');

    const [isLoading, setIsLoading] = useState(false);
    const [formError, setFormError] = useState('');

    const [initialStatus] = useState(customer?.connectionStatus);
    const isReactivating = initialStatus === ConnectionStatus.PAUSED && status === ConnectionStatus.ACTIVE;


    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value as ConnectionStatus;
        if (initialStatus === ConnectionStatus.PAUSED && newStatus === ConnectionStatus.ACTIVE) {
            setStartDate(new Date().toISOString().split('T')[0]);
        }
        setStatus(newStatus);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        const finalMonthlyBill = parseFloat(monthlyBill);
        if (isNaN(finalMonthlyBill) || finalMonthlyBill < 0) {
            setFormError(t('invalidBillAmount'));
            return;
        }

        setIsLoading(true);
        const commonData = { name, phone, address: area, area, monthlyBill: finalMonthlyBill, connectionStatus: status, startDate, reactivationDate: status === ConnectionStatus.PAUSED && reactivationDate ? reactivationDate : undefined };
        
        const result = customer 
            ? await updateCustomer({ ...customer, ...commonData, openingDue: parseFloat(openingDue) || 0 })
            : await addCustomer(commonData, parseFloat(openingDue) || 0);
            
        setIsLoading(false);

        if (result.success) {
            onSave();
        } else {
            setFormError(result.message || t('operationFailed'));
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {formError && <p className="text-red-500 text-center text-sm mb-4">{formError}</p>}
            <Input id="name" label={t('customerName')} value={name} onChange={e => setName(e.target.value)} required />
            <Input id="phone" label={t('phoneNumber')} type="tel" value={phone} onChange={e => setPhone(e.target.value)} required />
             <Select
                id="area-zone"
                label={t('areaZone')}
                value={area}
                onChange={e => setArea(e.target.value)}
                required
            >
                <option value="" disabled>{t('selectAnArea')}</option>
                {areas.map(a => (
                    <option key={a.id} value={a.name}>{a.name}</option>
                ))}
            </Select>
            <Input id="bill" label={t('monthlyBillAmount')} type="number" value={monthlyBill} onChange={e => setMonthlyBill(e.target.value)} placeholder="0" required />
            
            {!customer && (
                <div>
                    <Input
                        id="openingDue"
                        label={t('openingBalance')}
                        type="number"
                        value={openingDue}
                        onChange={e => setOpeningDue(e.target.value)}
                        placeholder="0"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('openingBalanceHelper')}</p>
                </div>
            )}
          
            <div>
              <Input id="start-date" label={t('startDate')} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
              {isReactivating && <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-1">{t('resumeBillingDateHelper')}</p>}
            </div>

            <Select
                id="connection-status"
                label={t('connectionStatus')}
                value={status}
                onChange={handleStatusChange}
            >
                <option value={ConnectionStatus.ACTIVE}>{t('active')}</option>
                <option value={ConnectionStatus.INACTIVE}>{t('inactive')}</option>
                <option value={ConnectionStatus.PAUSED}>{t('paused')}</option>
            </Select>

            {status === ConnectionStatus.PAUSED && (
                 <div>
                    <Input
                        id="reactivation-date"
                        label={t('reactivationDate')}
                        type="date"
                        value={reactivationDate}
                        onChange={e => setReactivationDate(e.target.value)}
                    />
                     <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('reactivationDateHelper')}</p>
                </div>
            )}

            <Button type="submit" isLoading={isLoading}>{t('saveCustomer')}</Button>
        </form>
    );
};


const AddCustomerScreen: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { isLocked } = useSubscriptionStatus();
    const [isModalOpen, setIsModalOpen] = useState(isLocked);

    if (isLocked) {
        return (
            <>
                <Header title={t('addCustomer')} showBackButton onBack={() => navigate(-1)} />
                <SubscriptionModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); navigate(-1); }} />
            </>
        );
    }
    
    return (
        <>
            <Header title={t('addCustomer')} showBackButton onBack={() => navigate(-1)} />
            <main className="p-4">
                <Card>
                    <CustomerForm onSave={() => navigate('/customers')} />
                </Card>
            </main>
        </>
    );
};

const EditCustomerScreen: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { getCustomerById } = useData();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const customer = id ? getCustomerById(id) : undefined;
    const { isLocked } = useSubscriptionStatus();
    const [isModalOpen, setIsModalOpen] = useState(isLocked);

    if (isLocked) {
        return (
            <>
                <Header title={t('editCustomer')} showBackButton onBack={() => navigate(-1)} />
                <SubscriptionModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); navigate(-1); }} />
            </>
        );
    }

    if (!customer) {
        return <p>Customer not found</p>;
    }

    return (
        <>
            <Header title={t('editCustomer')} showBackButton onBack={() => navigate(-1)} />
            <main className="p-4">
                <Card>
                    <CustomerForm customer={customer} onSave={() => navigate(`/customers/${id}`)} />
                </Card>
            </main>
        </>
    );
};


const CustomerListScreen: React.FC = () => {
    const { customers, areas } = useData();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { isLocked } = useSubscriptionStatus();
    const [isModalOpen, setIsModalOpen] = useState(isLocked);
    const { 
        customerSearchTerm: searchTerm, 
        setCustomerSearchTerm: setSearchTerm,
        customerAreaFilter: areaFilter,
        setCustomerAreaFilter: setAreaFilter,
        customerStatusFilter: statusFilter,
        setCustomerStatusFilter: setStatusFilter
    } = useFilters();

    const filteredCustomers = useMemo(() => {
        return customers.filter(customer => {
            const matchesSearch = searchTerm === '' ||
                customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                customer.phone.includes(searchTerm);

            const matchesArea = areaFilter === 'all' || customer.area === areaFilter;
            
            const matchesStatus = statusFilter === 'all' || customer.connectionStatus === statusFilter;

            return matchesSearch && matchesArea && matchesStatus;
        });
    }, [customers, searchTerm, areaFilter, statusFilter]);

    const getStatusBadge = (status: ConnectionStatus) => {
        switch (status) {
            case ConnectionStatus.ACTIVE:
                return 'bg-green-100 text-green-800';
            case ConnectionStatus.INACTIVE:
                return 'bg-red-100 text-red-800';
            case ConnectionStatus.PAUSED:
                return 'bg-yellow-100 text-yellow-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };
    
    if (isLocked) {
        return (
            <>
                <Header title={t('customerList')} showBackButton onBack={() => navigate('/')} />
                <SubscriptionModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); navigate('/'); }} />
            </>
        );
    }

    return (
        <>
            <Header title={t('customerList')} showBackButton onBack={() => navigate('/')} />
            <main className="p-4 space-y-3">
                <Card className="mb-4">
                    <div className="space-y-4">
                        <Input
                            id="search-customer"
                            label={t('searchCustomer')}
                            placeholder={t('searchByNameOrPhone')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <Select
                                id="area-filter"
                                label={t('filterByArea')}
                                value={areaFilter}
                                onChange={(e) => setAreaFilter(e.target.value)}
                            >
                                <option value="all">{t('allAreas')}</option>
                                {areas.map(area => (
                                    <option key={area.id} value={area.name}>{area.name}</option>
                                ))}
                            </Select>
                             <Select
                                id="status-filter"
                                label={t('filterByStatus')}
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="all">{t('allStatuses')}</option>
                                <option value={ConnectionStatus.ACTIVE}>{t('active')}</option>
                                <option value={ConnectionStatus.INACTIVE}>{t('inactive')}</option>
                                <option value={ConnectionStatus.PAUSED}>{t('paused')}</option>
                            </Select>
                        </div>
                    </div>
                </Card>

                {filteredCustomers.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400">No customers found.</p>
                ) : (
                    filteredCustomers.map(c => (
                        <Link to={`/customers/${c.id}`} key={c.id}>
                            <Card className="flex justify-between items-center transition-shadow hover:shadow-lg">
                                <div>
                                    <p className="font-bold text-gray-800 dark:text-white">{c.name}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{c.phone}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{c.area}</p>
                                </div>
                                <div className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(c.connectionStatus)}`}>
                                    {t(c.connectionStatus.toLowerCase() as 'active' | 'inactive' | 'paused')}
                                </div>
                            </Card>
                        </Link>
                    ))
                )}
            </main>
        </>
    );
};

const CustomerDetailScreen: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { getCustomerById, deletePayment, deleteCustomer, getDuePaymentsByCustomerId, deleteDuePayment, getBillsByCustomerId } = useData();
    const customer = id ? getCustomerById(id) : undefined;
    const customerBills = id ? getBillsByCustomerId(id) : [];
    const duePayments = id ? getDuePaymentsByCustomerId(id) : [];
    const navigate = useNavigate();
    const { t, language } = useTranslation();
    const [isBillModalOpen, setIsBillModalOpen] = useState(false);
    const [isDueModalOpen, setIsDueModalOpen] = useState(false);
    const [editingDuePayment, setEditingDuePayment] = useState<DuePayment | null>(null);
    const [deletingDuePayment, setDeletingDuePayment] = useState<DuePayment | null>(null);
    const [isDeleteCustomerModalOpen, setIsDeleteCustomerModalOpen] = useState(false);
    const [confirmUndoPayment, setConfirmUndoPayment] = useState<Bill | null>(null);
    const [isLoading, setIsLoading] = useState(false);


    if (!customer) return <p>Customer not found</p>;
    
    const monthlyDue = useMemo(() => {
        return customerBills
            .filter(b => b.status === BillStatus.UNPAID)
            .reduce((total, bill) => total + bill.amount, 0);
    }, [customerBills]);

    const handleDuePaymentDeleteConfirm = async () => {
        if (deletingDuePayment) {
            setIsLoading(true);
            await deleteDuePayment(deletingDuePayment.id);
            setIsLoading(false);
            setDeletingDuePayment(null);
        }
    };

    const handleCustomerDeleteConfirm = async () => {
        if (customer) {
            setIsLoading(true);
            const result = await deleteCustomer(customer.id);
            setIsLoading(false);
            if(result.success) {
                setIsDeleteCustomerModalOpen(false);
                navigate('/customers');
            } else {
                // Optionally show an error message
                alert(result.message || t('operationFailed'));
            }
        }
    };

    const handleUndoPaymentConfirm = async () => {
        if (confirmUndoPayment?.paymentId) {
            setIsLoading(true);
            await deletePayment(confirmUndoPayment.paymentId);
            setIsLoading(false);
            setConfirmUndoPayment(null);
        }
    };

    const getMonthName = (monthNumber: number) => {
        const date = new Date();
        date.setMonth(monthNumber - 1);
        return date.toLocaleString(language, { month: 'long' });
    };

    const getStatusTextColor = (status: ConnectionStatus) => {
        switch (status) {
            case ConnectionStatus.ACTIVE:
                return 'text-green-600 dark:text-green-400';
            case ConnectionStatus.INACTIVE:
                return 'text-red-600 dark:text-red-400';
            case ConnectionStatus.PAUSED:
                return 'text-yellow-600 dark:text-yellow-400';
            default:
                return '';
        }
    };

    return (
        <>
            <Header 
              title={customer.name} 
              showBackButton 
              onBack={() => navigate(-1)}
              rightContent={
                <Link to={`/customers/${customer.id}/edit`} aria-label={t('editCustomer')}>
                  <PencilIcon className="w-6 h-6 text-gray-600 dark:text-gray-300"/>
                </Link>
              }
            />
            <main className="p-4 space-y-4">
                <Card>
                    <h3 className="text-lg font-bold mb-2 text-gray-800 dark:text-white">Customer Details</h3>
                    <p><span className="font-semibold">{t('phoneNumber')}:</span> {customer.phone}</p>
                    <p><span className="font-semibold">{t('addressMoholla')}:</span> {customer.address}</p>
                    <p><span className="font-semibold">{t('areaZone')}:</span> {customer.area}</p>
                    <p><span className="font-semibold">{t('monthlyBillAmount')}:</span> {customer.monthlyBill}</p>
                    <p>
                        <span className="font-semibold">{t('connectionStatus')}:</span>{' '}
                        <span className={`font-bold ${getStatusTextColor(customer.connectionStatus)}`}>
                            {t(customer.connectionStatus.toLowerCase() as 'active' | 'inactive' | 'paused')}
                        </span>
                    </p>
                    <p><span className="font-semibold">{t('startDate')}:</span> {new Date(customer.startDate).toLocaleDateString(language)}</p>
                    {customer.connectionStatus === ConnectionStatus.PAUSED && customer.reactivationDate && (
                         <p><span className="font-semibold">{t('reactivationDate')}:</span> {new Date(customer.reactivationDate).toLocaleDateString(language)}</p>
                    )}
                    <p className={`font-bold text-lg mt-2 text-red-500`}>{t('monthlyDue')}: {monthlyDue.toFixed(2)}</p>
                </Card>
                <Button onClick={() => setIsBillModalOpen(true)}>{t('collectBill')}</Button>
                 
                 <Card>
                    <h3 className="text-lg font-bold mb-2 text-gray-800 dark:text-white">{t('dueManagement')}</h3>
                    <p className="font-bold text-lg text-red-500">{t('totalOutstandingDue')}: {customer.openingDue.toFixed(2)}</p>
                    <Button onClick={() => setIsDueModalOpen(true)} className="mt-2">{t('collectDuePayment')}</Button>
                    
                     <h4 className="text-md font-semibold mt-4 mb-2 text-gray-700 dark:text-gray-200">{t('duePaymentHistory')}</h4>
                     {duePayments.length > 0 ? (
                        <ul className="space-y-2">
                           {duePayments.map(p => (
                               <li key={p.id} className="flex justify-between items-center p-2 rounded bg-gray-50 dark:bg-gray-700">
                                   <div>
                                       <span>{new Date(p.date).toLocaleDateString(language)}</span>
                                       <span className="font-semibold ml-4">{p.amount.toFixed(2)}</span>
                                   </div>
                                   <div className="flex items-center space-x-3">
                                       <button onClick={() => setEditingDuePayment(p)} className="text-blue-500 hover:text-blue-700" aria-label="Edit Due Payment">
                                           <PencilIcon />
                                       </button>
                                       <button onClick={() => setDeletingDuePayment(p)} className="text-red-500 hover:text-red-700" aria-label="Delete Due Payment">
                                           <TrashIcon />
                                       </button>
                                   </div>
                               </li>
                           ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400">{t('noDuePayments')}</p>
                    )}
                </Card>

                <Card>
                    <h3 className="text-lg font-bold mb-2 text-gray-800 dark:text-white">{t('billHistory')}</h3>
                    {customerBills.length > 0 ? (
                        <ul className="space-y-2">
                           {customerBills.map(bill => (
                               <li key={bill.id} className="flex justify-between items-center p-2 rounded bg-gray-50 dark:bg-gray-700">
                                   <div>
                                       <span className="font-semibold">{getMonthName(bill.month)} {bill.year}</span>
                                       <span className="ml-4">{bill.amount.toFixed(2)}</span>
                                       {bill.status === BillStatus.PAID && bill.paidDate && (
                                           <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                               {t('paidOn')}: {new Date(bill.paidDate).toLocaleDateString(language)}
                                           </p>
                                       )}
                                   </div>
                                   <div className="flex items-center space-x-3">
                                        <span className={`px-2 py-1 text-xs rounded-full ${bill.status === BillStatus.PAID ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {t(bill.status.toLowerCase() as 'paid' | 'unpaid')}
                                        </span>
                                        {bill.status === BillStatus.PAID && (
                                            <button onClick={() => setConfirmUndoPayment(bill)} className="text-gray-500 hover:text-red-700" aria-label={t('undoPayment')}>
                                                <TrashIcon />
                                            </button>
                                        )}
                                   </div>
                               </li>
                           ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400">{t('noBillHistory')}</p>
                    )}
                </Card>

                <Card>
                     <Button onClick={() => setIsDeleteCustomerModalOpen(true)} variant="danger">
                        {t('deleteCustomer')}
                    </Button>
                </Card>
            </main>
            <CollectBillModal isOpen={isBillModalOpen} onClose={() => setIsBillModalOpen(false)} customer={customer} />
            <DuePaymentModal isOpen={isDueModalOpen} onClose={() => setIsDueModalOpen(false)} customer={customer} />
             {editingDuePayment && (
                <EditDuePaymentModal 
                    isOpen={!!editingDuePayment}
                    onClose={() => setEditingDuePayment(null)}
                    payment={editingDuePayment}
                />
            )}
             <ConfirmModal
                isOpen={!!deletingDuePayment}
                onClose={() => setDeletingDuePayment(null)}
                onConfirm={handleDuePaymentDeleteConfirm}
                title={t('confirmDeleteDuePaymentTitle')}
                isLoading={isLoading}
             >
                <p>{t('confirmDeleteDuePaymentMessage', { amount: deletingDuePayment?.amount.toFixed(2) || '' })}</p>
             </ConfirmModal>
             
             <ConfirmModal
                isOpen={!!confirmUndoPayment}
                onClose={() => setConfirmUndoPayment(null)}
                onConfirm={handleUndoPaymentConfirm}
                title={t('confirmUndoPaymentTitle')}
                confirmText={t('undoPayment')}
                isLoading={isLoading}
             >
                <p>{t('confirmUndoPaymentMessage', { monthYear: confirmUndoPayment ? `${getMonthName(confirmUndoPayment.month)} ${confirmUndoPayment.year}` : '' })}</p>
             </ConfirmModal>

            <ConfirmModal
                isOpen={isDeleteCustomerModalOpen}
                onClose={() => setIsDeleteCustomerModalOpen(false)}
                onConfirm={handleCustomerDeleteConfirm}
                title={t('confirmDeleteCustomerTitle')}
                isLoading={isLoading}
            >
                <p>{t('confirmDeleteCustomerMessage')}</p>
            </ConfirmModal>
        </>
    );
};

const CollectBillModal: React.FC<{isOpen: boolean, onClose: () => void, customer: Customer}> = ({isOpen, onClose, customer}) => {
    const { getBillsByCustomerId, addPayment } = useData();
    const { t, language } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);
    
    const unpaidBills = useMemo(() => 
        getBillsByCustomerId(customer.id)
            .filter(b => b.status === BillStatus.UNPAID)
            .sort((a, b) => a.year - b.year || a.month - a.month), // Sort oldest first
    [getBillsByCustomerId, customer.id]);

    const [selectedBills, setSelectedBills] = useState<Record<string, number>>({});
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        if(isOpen) {
            setSelectedBills({});
            setDate(new Date().toISOString().split('T')[0]);
            setIsLoading(false);
        }
    }, [isOpen]);

    const handleToggleBillSelection = (bill: Bill) => {
        setSelectedBills(prev => {
            const newSelection = { ...prev };
            if (newSelection.hasOwnProperty(bill.id)) {
                delete newSelection[bill.id];
            } else {
                newSelection[bill.id] = bill.amount;
            }
            return newSelection;
        });
    };
    
    const handleAmountChange = (billId: string, value: string, maxAmount: number) => {
        const amount = parseFloat(value);
        if (value === '') {
            setSelectedBills(prev => ({ ...prev, [billId]: 0 }));
            return;
        }
        if (!isNaN(amount) && amount >= 0 && amount <= maxAmount) {
            setSelectedBills(prev => ({ ...prev, [billId]: amount }));
        }
    };

    const totalSelectedAmount = useMemo(() => {
        // FIX: Add explicit types to the reduce function to avoid potential type inference issues.
        return Object.values(selectedBills).reduce((total: number, amount: number) => total + amount, 0);
    }, [selectedBills]);

    const getMonthName = (monthNumber: number) => {
        const date = new Date();
        date.setMonth(monthNumber - 1);
        return date.toLocaleString(language, { month: 'long' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (Object.keys(selectedBills).length === 0) return;

        setIsLoading(true);
        const paymentDate = new Date(date);
        const result = await addPayment({
            customerId: customer.id,
            amount: totalSelectedAmount,
            date: paymentDate.toISOString(),
            notes: `Paid for ${Object.keys(selectedBills).length} bill(s).`
        }, selectedBills);
        setIsLoading(false);

        if(result.success) {
            onClose();
        } else {
            alert(result.message || t('operationFailed'));
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('collectBill')}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <p className="font-semibold">{customer.name}</p>
                
                <h4 className="text-md font-semibold text-gray-700 dark:text-gray-200">{t('selectBillsToPay')}</h4>
                <div className="max-h-60 overflow-y-auto space-y-2 p-2 border rounded-md dark:border-gray-600">
                    {unpaidBills.length > 0 ? (
                        unpaidBills.map(bill => (
                            <div key={bill.id} className="flex items-center justify-between p-2 rounded-md bg-gray-50 dark:bg-gray-700">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">{getMonthName(bill.month)} {bill.year}</span>
                                    <input
                                        type="number"
                                        value={selectedBills[bill.id] ?? bill.amount}
                                        onChange={(e) => handleAmountChange(bill.id, e.target.value, bill.amount)}
                                        disabled={!selectedBills.hasOwnProperty(bill.id)}
                                        className="w-24 p-1 border rounded text-right bg-white dark:bg-gray-600 dark:border-gray-500 disabled:bg-gray-200 disabled:text-gray-500 dark:disabled:bg-gray-800"
                                        step="0.01"
                                        min="0"
                                        max={bill.amount}
                                    />
                                </div>
                                <input
                                    type="checkbox"
                                    checked={selectedBills.hasOwnProperty(bill.id)}
                                    onChange={() => handleToggleBillSelection(bill)}
                                    className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-4">{t('noUnpaidBills')}</p>
                    )}
                </div>

                <div className="font-bold text-lg text-right">
                    {t('totalSelected')}: {totalSelectedAmount.toFixed(2)}
                </div>

                <Input id="payment-date" label={t('paymentDate')} type="date" value={date} onChange={e => setDate(e.target.value)} required />
                <Button type="submit" disabled={Object.keys(selectedBills).length === 0} isLoading={isLoading}>{t('submitPayment')}</Button>
            </form>
        </Modal>
    );
};

const DuePaymentModal: React.FC<{isOpen: boolean, onClose: () => void, customer: Customer}> = ({isOpen, onClose, customer}) => {
    const [amount, setAmount] = useState(customer.openingDue > 0 ? customer.openingDue : 0);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [isLoading, setIsLoading] = useState(false);
    const { addDuePayment } = useData();
    const { t } = useTranslation();

    useEffect(() => {
        setAmount(customer.openingDue > 0 ? customer.openingDue : 0);
        setIsLoading(false);
    }, [customer.openingDue, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        const paymentDate = new Date(date);
        const result = await addDuePayment({
            customerId: customer.id,
            amount,
            date: paymentDate.toISOString(),
        });
        setIsLoading(false);
        if(result.success) {
            onClose();
        } else {
            alert(result.message || t('operationFailed'));
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('collectDuePayment')}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <p className="font-semibold">{customer.name}</p>
                 <p className="text-sm text-gray-500">{t('totalOutstandingDue')}: {customer.openingDue.toFixed(2)}</p>
                <Input id="due-amount" label={t('amount')} type="number" value={amount} onChange={e => setAmount(parseFloat(e.target.value))} required />
                <Input id="due-payment-date" label={t('paymentDate')} type="date" value={date} onChange={e => setDate(e.target.value)} required />
                <Button type="submit" isLoading={isLoading}>{t('submitPayment')}</Button>
            </form>
        </Modal>
    );
};

const EditDuePaymentModal: React.FC<{isOpen: boolean, onClose: () => void, payment: DuePayment}> = ({isOpen, onClose, payment}) => {
    const [amount, setAmount] = useState(payment.amount);
    const [date, setDate] = useState(new Date(payment.date).toISOString().split('T')[0]);
    const [isLoading, setIsLoading] = useState(false);
    const { updateDuePayment } = useData();
    const { t } = useTranslation();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        const result = await updateDuePayment({
            ...payment,
            amount,
            date: new Date(date).toISOString(),
        });
        setIsLoading(false);
        if(result.success) {
            onClose();
        } else {
            alert(result.message || t('operationFailed'));
        }
    };
    
    useEffect(() => {
        setAmount(payment.amount);
        setDate(new Date(payment.date).toISOString().split('T')[0]);
        setIsLoading(false);
    }, [payment, isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Due Payment">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input id="edit-due-amount" label={t('amount')} type="number" value={amount} onChange={e => setAmount(parseFloat(e.target.value))} required />
                <Input id="edit-due-payment-date" label={t('paymentDate')} type="date" value={date} onChange={e => setDate(e.target.value)} required />
                <Button type="submit" isLoading={isLoading}>{t('saveChanges')}</Button>
            </form>
        </Modal>
    );
};


const PaymentHistoryScreen: React.FC = () => {
    const { payments, getCustomerById } = useData();
    const { t, language } = useTranslation();
    const navigate = useNavigate();
    const { isLocked } = useSubscriptionStatus();
    const [isModalOpen, setIsModalOpen] = useState(isLocked);

    const sortedPayments = useMemo(() => {
        return [...payments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [payments]);

    if (isLocked) {
        return (
            <>
                <Header title={t('paymentHistory')} showBackButton onBack={() => navigate(-1)} />
                <SubscriptionModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); navigate(-1); }} />
            </>
        );
    }
    
    return (
        <>
            <Header title={t('paymentHistory')} showBackButton onBack={() => navigate(-1)} />
            <main className="p-4">
                <Card>
                    {sortedPayments.length > 0 ? (
                        <ul className="space-y-3">
                            {sortedPayments.map(p => {
                                const customer = getCustomerById(p.customerId);
                                return (
                                    <li key={p.id} className="p-3 rounded-md bg-gray-50 dark:bg-gray-700">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-gray-800 dark:text-white">{customer ? customer.name : 'Unknown Customer'}</p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(p.date).toLocaleDateString(language)}</p>
                                            </div>
                                            <p className="font-semibold text-green-600">{p.amount.toFixed(2)}</p>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <p className="text-center text-gray-500 dark:text-gray-400">No payment history found.</p>
                    )}
                </Card>
            </main>
        </>
    );
};


const ReportsScreen: React.FC = () => {
    const { customers, payments, bills, areas } = useData();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [areaFilter, setAreaFilter] = useState('all');

    const {
        totalDue,
        totalCollectionThisMonth,
        totalCustomersInFilter
    } = useMemo(() => {
        const filteredCustomers = customers.filter(c => areaFilter === 'all' || c.area === areaFilter);
        const filteredCustomerIds = new Set(filteredCustomers.map(c => c.id));
        
        const filteredBills = bills.filter(b => filteredCustomerIds.has(b.customerId));
        const filteredPayments = payments.filter(p => filteredCustomerIds.has(p.customerId));

        const monthlyDue = filteredBills
            .filter(b => b.status === BillStatus.UNPAID)
            .reduce((sum, bill) => sum + bill.amount, 0);
        
        const openingDue = filteredCustomers.reduce((sum, customer) => sum + customer.openingDue, 0);
        
        const due = monthlyDue + openingDue;

        const collection = filteredPayments
            .filter(p => new Date(p.date).getMonth() === new Date().getMonth() && new Date(p.date).getFullYear() === new Date().getFullYear())
            .reduce((acc, p) => acc + p.amount, 0);

        return {
            totalDue: due,
            totalCollectionThisMonth: collection,
            totalCustomersInFilter: filteredCustomers.length
        };
    }, [customers, payments, bills, areaFilter]);

    return (
        <>
            <Header title={t('reports')} showBackButton onBack={() => navigate('/')} />
            <main className="p-4 space-y-4">
                <Card>
                    <Select
                        id="report-area-filter"
                        label={t('filterByArea')}
                        value={areaFilter}
                        onChange={(e) => setAreaFilter(e.target.value)}
                    >
                        <option value="all">{t('allAreas')}</option>
                        {areas.map(area => (
                            <option key={area.id} value={area.name}>{area.name}</option>
                        ))}
                    </Select>
                </Card>
                <Card>
                    <h3 className="text-lg font-bold">{t('collectionThisMonth')}</h3>
                    <p className="text-2xl font-bold text-green-600">{totalCollectionThisMonth.toFixed(2)}</p>
                </Card>
                <Card>
                    <h3 className="text-lg font-bold">{t('dueReport')}</h3>
                    <p className="text-2xl font-bold text-red-600">{totalDue.toFixed(2)}</p>
                </Card>
                <Card>
                    <h3 className="text-lg font-bold">{t('totalCustomers')}</h3>
                    <p className="text-2xl font-bold">{totalCustomersInFilter}</p>
                </Card>
            </main>
        </>
    );
};

const AreaManagementScreen: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { areas, addArea, deleteArea } = useData();
    const [areaName, setAreaName] = useState('');
    const [deletingArea, setDeletingArea] = useState<Area | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [formMessage, setFormMessage] = useState({ type: '', text: '' });

    const handleAddArea = async (e: React.FormEvent) => {
        e.preventDefault();
        if (areaName.trim()) {
            setIsLoading(true);
            setFormMessage({ type: '', text: '' });
            const result = await addArea(areaName.trim());
            setIsLoading(false);
            if(result.success) {
                setAreaName('');
                setFormMessage({ type: 'success', text: t('areaSavedSuccess') });
                setTimeout(() => setFormMessage({ type: '', text: '' }), 2000);
            } else {
                setFormMessage({ type: 'error', text: result.message || t('operationFailed') });
            }
        }
    };
    
    const handleDeleteConfirm = async () => {
        if (deletingArea) {
            setIsLoading(true);
            await deleteArea(deletingArea.id);
            setIsLoading(false);
            setDeletingArea(null);
        }
    };

    return (
        <>
            <Header title={t('manageAreas')} showBackButton onBack={() => navigate('/')} />
            <main className="p-4 space-y-4">
                <Card>
                    <form onSubmit={handleAddArea} className="space-y-4">
                        {formMessage.text && (
                            <p className={`text-center text-sm ${formMessage.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>
                                {formMessage.text}
                            </p>
                        )}
                        <Input 
                            id="area-name"
                            label={t('areaName')}
                            value={areaName}
                            onChange={(e) => setAreaName(e.target.value)}
                            required
                        />
                        <Button type="submit" isLoading={isLoading}>{t('saveArea')}</Button>
                    </form>
                </Card>
                <Card>
                    <h3 className="text-lg font-bold mb-2 text-gray-800 dark:text-white">{t('areaList')}</h3>
                    {areas.length > 0 ? (
                        <ul className="space-y-2">
                           {areas.map(area => (
                               <li key={area.id} className="flex justify-between items-center p-2 rounded bg-gray-50 dark:bg-gray-700">
                                   <span className="font-semibold">{area.name}</span>
                                   <button onClick={() => setDeletingArea(area)} className="text-red-500 hover:text-red-700" aria-label={`Delete ${area.name}`}>
                                       <TrashIcon />
                                   </button>
                               </li>
                           ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400">No areas added yet.</p>
                    )}
                </Card>
            </main>
            <ConfirmModal
                isOpen={!!deletingArea}
                onClose={() => setDeletingArea(null)}
                onConfirm={handleDeleteConfirm}
                title={t('confirmDeleteAreaTitle')}
                isLoading={isLoading}
            >
                <p>{t('confirmDeleteAreaMessage')}</p>
                <p><strong>{deletingArea?.name}</strong></p>
            </ConfirmModal>
        </>
    );
};

const ChangePasswordModal: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => {
    const { changePassword } = useAuth();
    const { t } = useTranslation();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const resetForm = () => {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setError('');
        setSuccess('');
        setLoading(false);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (newPassword !== confirmPassword) {
            setError(t('passwordMismatch'));
            return;
        }
        if (newPassword.length < 6) {
            setError(t('weakPassword'));
            return;
        }

        setLoading(true);
        const result = await changePassword(currentPassword, newPassword);
        setLoading(false);

        if (result.success) {
            setSuccess(t('passwordUpdateSuccess'));
            setTimeout(() => {
                handleClose();
            }, 2000);
        } else {
             if (result.message.includes('weak-password')) {
                setError(t('weakPassword'));
            } else {
                setError(t('passwordUpdateError'));
            }
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={t('changePassword')}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                {success && <p className="text-green-500 text-sm text-center">{success}</p>}

                <Input
                    id="current-password"
                    label={t('currentPassword')}
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    required
                    disabled={loading}
                />
                <Input
                    id="new-password"
                    label={t('newPassword')}
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    disabled={loading}
                />
                <Input
                    id="confirm-password"
                    label={t('confirmNewPassword')}
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                />
                <Button type="submit" isLoading={loading}>
                    {t('updatePassword')}
                </Button>
            </form>
        </Modal>
    );
};

const EditProfileModal: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => {
    const { user, updateUserProfile } = useAuth();
    const { t } = useTranslation();
    const [fullName, setFullName] = useState(user?.fullName || '');
    const [companyName, setCompanyName] = useState(user?.companyName || '');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && user) {
            setFullName(user.fullName);
            setCompanyName(user.companyName);
            setError('');
            setSuccess('');
            setLoading(false);
        }
    }, [isOpen, user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!fullName.trim() || !companyName.trim()) {
            setError("Fields cannot be empty.");
            return;
        }

        setLoading(true);
        const result = await updateUserProfile({ fullName, companyName });
        setLoading(false);

        if (result.success) {
            setSuccess(t('profileUpdateSuccess'));
            setTimeout(() => {
                onClose();
            }, 1500);
        } else {
            setError(result.message || t('profileUpdateError'));
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('editProfile')}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                {success && <p className="text-green-500 text-sm text-center">{success}</p>}

                <Input
                    id="edit-fullname"
                    label={t('fullName')}
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    required
                    disabled={loading}
                />
                <Input
                    id="edit-companyname"
                    label={t('companyName')}
                    type="text"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    required
                    disabled={loading}
                />
                <Button type="submit" isLoading={loading}>
                    {t('saveChanges')}
                </Button>
            </form>
        </Modal>
    );
};


const SettingsScreen: React.FC = () => {
    const { t, language, setLanguage } = useTranslation();
    const { theme, toggleTheme } = useTheme();
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
    const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
    const { status, trialDaysLeft } = useSubscriptionStatus();


    const handleLogout = () => {
        logout();
        navigate('/auth');
    };
    
    const getStatusChip = () => {
        switch (status) {
            case 'active':
                return <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">{t('lifetimeAccess')}</span>;
            case 'pending':
                return <span className="px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-100 rounded-full">{t('pending')}</span>;
            case 'free_trial':
                const daysText = trialDaysLeft === 1 ? t('day') : t('days');
                return <span className="px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-100 rounded-full">{t('free_trial')} ({trialDaysLeft} {daysText})</span>;
            default:
                return null;
        }
    };

    return (
        <>
            <Header title={t('settings')} showBackButton onBack={() => navigate('/')} />
            <main className="p-4 space-y-4">
                <Card>
                    <h3 className="text-lg font-semibold mb-2">{t('subscription')}</h3>
                    <div className="flex items-center justify-between">
                         <div>
                            <p className="text-sm text-gray-600 dark:text-gray-300">{t('yourSubscriptionIs')}</p>
                            <p className="font-medium text-gray-800 dark:text-white">{getStatusChip()}</p>
                        </div>
                        {status !== 'active' && (
                             <Button variant="secondary" onClick={() => navigate('/subscription')} className="w-auto px-4">
                                {t('upgrade')}
                             </Button>
                        )}
                    </div>
                </Card>
                <Card>
                    <h3 className="text-lg font-semibold mb-2">{t('themeSettings')}</h3>
                    <div className="flex items-center justify-between">
                        <span>{theme === 'light' ? t('lightMode') : t('darkMode')}</span>
                        <button onClick={toggleTheme} className="p-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                            {theme === 'light' ? '🌙' : '☀️'}
                        </button>
                    </div>
                </Card>
                <Card>
                    <h3 className="text-lg font-semibold mb-2">{t('languageSettings')}</h3>
                    <div className="flex space-x-2">
                        <Button variant={language === 'en' ? 'primary' : 'secondary'} onClick={() => setLanguage('en')}>English</Button>
                        <Button variant={language === 'bn' ? 'primary' : 'secondary'} onClick={() => setLanguage('bn')}>বাংলা</Button>
                    </div>
                </Card>
                <Card>
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-semibold">{t('profilePassword')}</h3>
                        <button onClick={() => setIsEditProfileModalOpen(true)} className="text-indigo-600 dark:text-indigo-400 p-1">
                            <PencilIcon />
                        </button>
                    </div>
                    <div className="text-sm space-y-2">
                        <div>
                            <p className="text-gray-500 dark:text-gray-400">{t('fullName')}</p>
                            <p className="font-medium text-gray-800 dark:text-white">{user?.fullName}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 dark:text-gray-400">{t('companyName')}</p>
                            <p className="font-medium text-gray-800 dark:text-white">{user?.companyName}</p>
                        </div>
                         <div>
                            <p className="text-gray-500 dark:text-gray-400">{t('emailOrPhone')}</p>
                            <p className="font-medium text-gray-800 dark:text-white">{user?.emailOrPhone}</p>
                        </div>
                    </div>
                    <Button
                        className="mt-4"
                        variant="secondary"
                        onClick={() => setIsChangePasswordModalOpen(true)}
                    >
                        {t('changePassword')}
                    </Button>
                </Card>
                <Card className="text-center">
                    <h3 className="text-lg font-semibold mb-2">{t('about')}</h3>
                    <p>{t('madeBy')}</p>
                    <p>{t('contactMe')}</p>
                    <p className="font-semibold">
                         <a 
                            href="https://t.me/Ytdecoderpro"
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center justify-center space-x-2"
                        >
                            <TelegramIcon className="w-5 h-5" />
                            <span>{t('telegramLabel')}</span>
                        </a>
                    </p>
                </Card>
                <Button onClick={handleLogout} variant="danger">{t('logout')}</Button>
            </main>
            <ChangePasswordModal isOpen={isChangePasswordModalOpen} onClose={() => setIsChangePasswordModalOpen(false)} />
            <EditProfileModal isOpen={isEditProfileModalOpen} onClose={() => setIsEditProfileModalOpen(false)} />
        </>
    );
};

const SubscriptionScreen: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { status } = useSubscriptionStatus();
    const { submitSubscriptionRequest } = useData();

    const [senderPhone, setSenderPhone] = useState('');
    const [transactionId, setTransactionId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage({ type: '', text: '' });
        const result = await submitSubscriptionRequest({ senderPhone, transactionId });
        setIsLoading(false);
        if (result.success) {
            setMessage({ type: 'success', text: t('requestSubmittedSuccess') });
        } else {
            setMessage({ type: 'error', text: result.message || t('requestSubmittedError') });
        }
    };

    const renderContent = () => {
        if (status === 'pending') {
            return (
                <Card className="text-center">
                    <h3 className="text-xl font-bold mb-2">{t('verificationPending')}</h3>
                    <p className="text-gray-600 dark:text-gray-300">{t('verificationPendingMessage')}</p>
                </Card>
            );
        }
        if (status === 'active') {
             return (
                <Card className="text-center">
                    <h3 className="text-xl font-bold mb-2 text-green-600 dark:text-green-400">{t('subscriptionActive')}</h3>
                    <p className="text-gray-600 dark:text-gray-300">{t('subscriptionActiveMessage')}</p>
                </Card>
            );
        }
        // free_trial or expired
        return (
            <>
                <Card className="text-center">
                    <StarIcon className="w-12 h-12 mx-auto text-yellow-500 mb-2"/>
                    <h2 className="text-2xl font-bold">{t('lifetimeAccess')}</h2>
                    <p className="text-4xl font-extrabold my-2">৳1000</p>
                    <p className="text-gray-500 dark:text-gray-400">{t('unlockAllFeatures')}</p>
                </Card>
                <Card>
                    <h3 className="text-lg font-semibold mb-2">{t('paymentInstructions')}</h3>
                    <div className="space-y-2 text-center bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                        <p>{t('sendAmountTo')}</p>
                        <p className="font-bold text-lg text-indigo-600 dark:text-indigo-400">{t('bkashNumber')}</p>
                        <p>{t('thenEnterDetails')}</p>
                    </div>
                </Card>
                <Card>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {message.text && (
                            <p className={`text-center text-sm ${message.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>
                                {message.text}
                            </p>
                        )}
                        <Input id="sender-phone" label={t('senderPhoneNumber')} type="tel" value={senderPhone} onChange={e => setSenderPhone(e.target.value)} required />
                        <Input id="trx-id" label={t('transactionId')} type="text" value={transactionId} onChange={e => setTransactionId(e.target.value)} required />
                        <Button type="submit" isLoading={isLoading}>{t('submitForVerification')}</Button>
                    </form>
                </Card>
            </>
        );
    };

    return (
        <>
            <Header title={t('upgradeToPro')} showBackButton onBack={() => navigate(-1)} />
            <main className="p-4 space-y-4">
                {renderContent()}
            </main>
        </>
    );
};


const ReminderScreen: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { isLocked } = useSubscriptionStatus();
    const [isModalOpen, setIsModalOpen] = useState(isLocked);

    if (isLocked) {
        return (
            <>
                <Header title={t('smsCallReminder')} showBackButton onBack={() => navigate('/')} />
                 <SubscriptionModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); navigate(-1); }} />
            </>
        );
    }

    return (
        <>
            <Header title={t('smsCallReminder')} showBackButton onBack={() => navigate('/')} />
            <main className="p-4">
                <Card className="text-center">
                    <h3 className="text-lg font-semibold mb-2">Feature Coming Soon</h3>
                    <p className="text-gray-500 dark:text-gray-400">
                        This feature will allow you to send SMS reminders to customers with due bills.
                    </p>
                </Card>
            </main>
        </>
    );
};


// --- LAYOUT & ROUTING ---

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated } = useAuth();
    
    if (!isAuthenticated) {
        return <Navigate to="/auth" replace />;
    }
    return <>{children}</>;
};

const MainLayout: React.FC = () => {
    const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

    return (
        <div className="max-w-md mx-auto bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen pb-16">
            <Outlet />

            <button
                onClick={() => setIsCalculatorOpen(true)}
                className="fixed bottom-20 right-4 z-20 bg-indigo-600 text-white p-3 rounded-full shadow-lg hover:bg-indigo-700 transition-transform transform active:scale-95"
                aria-label="Open Calculator"
            >
                <CalculatorIcon />
            </button>
            
            <Modal isOpen={isCalculatorOpen} onClose={() => setIsCalculatorOpen(false)} title="Quick Calculator">
                <Calculator />
            </Modal>

            <div className="h-16"></div> {/* Bottom padding for nav */}
            <div className="md:hidden">
                <BottomNav />
            </div>
        </div>
    );
};

const AppRoutes: React.FC = () => {
    const { isAuthenticated } = useAuth();
    return (
         <HashRouter>
            <Routes>
                <Route path="/auth" element={<AuthScreen />} />
                <Route path="/" element={
                    <ProtectedRoute>
                        <MainLayout />
                    </ProtectedRoute>
                }>
                    <Route index element={<HomeScreen />} />
                    <Route path="reports" element={<ReportsScreen />} />
                    <Route path="reports/history" element={<PaymentHistoryScreen />} />
                    <Route path="customers" element={<CustomerListScreen />} />
                    <Route path="customers/add" element={<AddCustomerScreen />} />
                    <Route path="customers/:id" element={<CustomerDetailScreen />} />
                    <Route path="customers/:id/edit" element={<EditCustomerScreen />} />
                    <Route path="areas" element={<AreaManagementScreen />} />
                    <Route path="settings" element={<SettingsScreen />} />
                    <Route path="subscription" element={<SubscriptionScreen />} />
                    <Route path="reminders" element={<ReminderScreen />} />
                </Route>
                <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/auth"} replace />} />
            </Routes>
        </HashRouter>
    );
};

const RootNavigator: React.FC = () => {
    const { loading } = useAuth();
    const [isAnimationTimeFinished, setIsAnimationTimeFinished] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsAnimationTimeFinished(true);
        }, 2500); // Guarantee 2.5 seconds for the splash animation

        return () => clearTimeout(timer);
    }, []);

    // Show splash screen while auth is loading OR the minimum animation time hasn't passed
    if (loading || !isAnimationTimeFinished) {
        return <SplashScreen />;
    }

    // Once both conditions are met, show the main app routes
    return <AppRoutes />;
};


const App: React.FC = () => {
    return (
        <AppContextProvider>
            <RootNavigator />
        </AppContextProvider>
    );
};

export default App;