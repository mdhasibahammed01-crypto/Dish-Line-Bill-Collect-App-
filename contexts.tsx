import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { useLocalStorage } from './hooks';
import type { Theme, Language, User, Customer, Payment, Area, DuePayment, Bill } from './types';
import { ConnectionStatus, BillStatus } from './types';
import { auth, db } from './firebase';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    User as FirebaseUser,
    updatePassword,
    EmailAuthProvider,
    reauthenticateWithCredential,
    sendPasswordResetEmail,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    query,
    writeBatch,
    getDoc,
    setDoc,
    deleteField,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';


// Theme Context
interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}
export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useLocalStorage<Theme>('theme', 'light');

  React.useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(theme === 'light' ? 'dark' : 'light');
    root.classList.add(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};


// Language Context
interface LanguageContextType {
    language: Language;
    setLanguage: (language: Language) => void;
}
export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguage] = useLocalStorage<Language>('language', 'en');
    return (
        <LanguageContext.Provider value={{ language, setLanguage }}>
            {children}
        </LanguageContext.Provider>
    );
};


// Auth Context
interface AuthContextType {
    isAuthenticated: boolean;
    user: User | null;
    firebaseUser: FirebaseUser | null;
    loading: boolean;
    login: (emailOrPhone: string, password: string) => Promise<boolean>;
    register: (userData: Omit<User, 'id' | 'subscriptionStatus' | 'trialEndDate'>, password: string) => Promise<boolean>;
    logout: () => void;
    changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
    forgotPassword: (email: string) => Promise<{ success: boolean; code?: string }>;
    updateUserProfile: (data: { fullName: string; companyName: string }) => Promise<{ success: boolean; message?: string }>;
}
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
            if (fbUser) {
                setFirebaseUser(fbUser);
                const userDocRef = doc(db, 'users', fbUser.uid);
                
                const unsubUser = onSnapshot(userDocRef, (userDocSnap) => {
                    if (userDocSnap.exists()) {
                        const userData = userDocSnap.data();
                        
                        // --- START: Migration logic for existing users ---
                        if (!userData.subscriptionStatus) {
                            const trialEndDate = new Date();
                            trialEndDate.setDate(trialEndDate.getDate() + 30);
                            trialEndDate.setHours(23, 59, 59, 999);
                            
                            updateDoc(userDocRef, {
                                subscriptionStatus: 'free_trial',
                                trialEndDate: trialEndDate.toISOString()
                            }).catch(err => console.error("Failed to migrate user:", err));
                        }
                        // --- END: Migration logic ---

                        setUser({ id: userDocSnap.id, ...userData } as User);
                    }
                    setLoading(false);
                }, (error) => {
                    console.error("Error fetching user document:", error);
                    // This might happen if security rules are too restrictive.
                    // We still need to stop loading, but the user data will be incomplete.
                    setLoading(false);
                });
                return () => unsubUser();
            } else {
                setFirebaseUser(null);
                setUser(null);
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    const login = useCallback(async (emailOrPhone: string, password: string): Promise<boolean> => {
        try {
            await signInWithEmailAndPassword(auth, emailOrPhone, password);
            return true;
        } catch (error) {
            console.error("Login failed:", error);
            return false;
        }
    }, []);

    const register = useCallback(async (userData: Omit<User, 'id' | 'subscriptionStatus' | 'trialEndDate'>, password: string): Promise<boolean> => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, userData.emailOrPhone, password);
            const fbUser = userCredential.user;
            
            const trialEndDate = new Date();
            trialEndDate.setDate(trialEndDate.getDate() + 30);
            trialEndDate.setHours(23, 59, 59, 999); // Set to end of the 30th day
            
            const fullUserData: Omit<User, 'id'> = {
                ...userData,
                subscriptionStatus: 'free_trial',
                trialEndDate: trialEndDate.toISOString(),
            };

            const userDocRef = doc(db, 'users', fbUser.uid);
            await setDoc(userDocRef, fullUserData);
            return true;
        } catch (error) {
            console.error("Registration failed:", error);
            return false;
        }
    }, []);

    const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
        if (!firebaseUser || !firebaseUser.email) {
            return { success: false, message: 'User not logged in.' };
        }

        try {
            const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
            await reauthenticateWithCredential(firebaseUser, credential);
            await updatePassword(firebaseUser, newPassword);
            return { success: true, message: 'Password updated successfully!' };
        } catch (error: any) {
            console.error("Password change failed:", error);
            let message = 'An error occurred.';
            if (error.code === 'auth/wrong-password') {
                message = 'Incorrect current password.';
            } else if (error.code === 'auth/weak-password') {
                message = 'Password should be at least 6 characters.';
            }
            return { success: false, message: message };
        }
    }, [firebaseUser]);

    const forgotPassword = useCallback(async (email: string): Promise<{ success: boolean; code?: string }> => {
        try {
            await sendPasswordResetEmail(auth, email);
            return { success: true };
        } catch (error: any) {
            console.error("Forgot password failed:", error);
            return { success: false, code: error.code };
        }
    }, []);

    const updateUserProfile = useCallback(async (data: { fullName: string; companyName: string }): Promise<{ success: boolean; message?: string }> => {
        if (!firebaseUser) {
            return { success: false, message: "User not authenticated." };
        }
        try {
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            await updateDoc(userDocRef, data);
            return { success: true };
        } catch (error) {
            console.error("Error updating user profile:", error);
            return { success: false, message: "Failed to update profile." };
        }
    }, [firebaseUser]);
    
    const logout = useCallback(async () => {
        await signOut(auth);
    }, []);

    const value = useMemo(() => ({
        isAuthenticated: !!firebaseUser,
        user,
        firebaseUser,
        loading,
        login,
        register,
        logout,
        changePassword,
        forgotPassword,
        updateUserProfile,
    }), [firebaseUser, user, loading, login, register, logout, changePassword, forgotPassword, updateUserProfile]);
    
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// --- Helper function to remove undefined fields for Firestore ---
const cleanData = (obj: any) => {
    const newObj: { [key: string]: any } = {};
    Object.keys(obj).forEach(key => {
        if (obj[key] !== undefined) {
            newObj[key] = obj[key];
        }
    });
    return newObj;
};


// Data Context
type MutationResult = { success: boolean; message?: string };
interface DataContextType {
    customers: Customer[];
    payments: Payment[];
    areas: Area[];
    duePayments: DuePayment[];
    bills: Bill[];
    addCustomer: (customer: Omit<Customer, 'id'|'openingDue'>, openingDue: number) => Promise<MutationResult>;
    updateCustomer: (customer: Customer) => Promise<MutationResult>;
    deleteCustomer: (customerId: string) => Promise<MutationResult>;
    getCustomerById: (id: string) => Customer | undefined;
    addPayment: (payment: Omit<Payment, 'id'>, billsToPay: Record<string, number>) => Promise<MutationResult>;
    deletePayment: (paymentId: string) => Promise<MutationResult>;
    getPaymentsByCustomerId: (customerId: string) => Payment[];
    addArea: (name: string) => Promise<MutationResult>;
    deleteArea: (areaId: string) => Promise<MutationResult>;
    addDuePayment: (payment: Omit<DuePayment, 'id'>) => Promise<MutationResult>;
    updateDuePayment: (updatedPayment: DuePayment) => Promise<MutationResult>;
    deleteDuePayment: (paymentId: string) => Promise<MutationResult>;
    getDuePaymentsByCustomerId: (customerId: string) => DuePayment[];
    getBillsByCustomerId: (customerId: string) => Bill[];
    submitSubscriptionRequest: (data: { senderPhone: string; transactionId: string }) => Promise<MutationResult>;
}
export const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [areas, setAreas] = useState<Area[]>([]);
    const [duePayments, setDuePayments] = useState<DuePayment[]>([]);
    const [bills, setBills] = useState<Bill[]>([]);
    const [initialBillsLoaded, setInitialBillsLoaded] = useState(false);

    const userId = user?.id;

    useEffect(() => {
        if (!userId) {
            setCustomers([]); setPayments([]); setAreas([]); setDuePayments([]); setBills([]);
            setInitialBillsLoaded(false);
            return;
        };

        const collections = {
            customers: collection(db, 'users', userId, 'customers'),
            payments: collection(db, 'users', userId, 'payments'),
            areas: collection(db, 'users', userId, 'areas'),
            duePayments: collection(db, 'users', userId, 'duePayments'),
            bills: collection(db, 'users', userId, 'bills'),
        };
        
        const unsubscribes = [
            onSnapshot(query(collections.customers), 
                snapshot => setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer))),
                error => console.error("Firestore 'customers' listener error:", error)
            ),
            onSnapshot(query(collections.payments), 
                snapshot => setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment))),
                error => console.error("Firestore 'payments' listener error:", error)
            ),
            onSnapshot(query(collections.areas), 
                snapshot => setAreas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Area))),
                error => console.error("Firestore 'areas' listener error:", error)
            ),
            onSnapshot(query(collections.duePayments), 
                snapshot => setDuePayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DuePayment))),
                error => console.error("Firestore 'duePayments' listener error:", error)
            ),
            onSnapshot(query(collections.bills), snapshot => {
                setBills(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bill)));
                if (!initialBillsLoaded) {
                    setInitialBillsLoaded(true);
                }
            },
            error => console.error("Firestore 'bills' listener error:", error)
            ),
        ];

        return () => {
             unsubscribes.forEach(unsub => unsub());
             setInitialBillsLoaded(false);
        }

    }, [userId]);


    // --- Automatic Bill Generation ---
    useEffect(() => {
        if(!userId || !initialBillsLoaded || customers.length === 0) return;

        const generateBills = async () => {
            const currentDate = new Date();
            const currentYear = currentDate.getFullYear();
            const currentMonth = currentDate.getMonth(); // 0-indexed
            const batch = writeBatch(db);
    
            customers.forEach(customer => {
                if (customer.connectionStatus === ConnectionStatus.ACTIVE) {
                    const startDate = new Date(customer.startDate);
                    if (startDate > currentDate) return;

                    let loopDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    
                    while (loopDate.getFullYear() < currentYear || (loopDate.getFullYear() === currentYear && loopDate.getMonth() <= currentMonth)) {
                        const year = loopDate.getFullYear();
                        const month = loopDate.getMonth() + 1;
    
                        const billId = `${customer.id}-${year}-${month}`;
                        const billExists = bills.some(b => b.id === billId);
    
                        if (!billExists) {
                            const dueDate = new Date(year, month, 0);
                            const newBill: Omit<Bill, 'id'> = {
                                customerId: customer.id,
                                amount: customer.monthlyBill,
                                month, year, status: BillStatus.UNPAID,
                                dueDate: dueDate.toISOString(),
                            };
                            const billRef = doc(db, 'users', userId, 'bills', billId);
                            batch.set(billRef, newBill);
                        }
                        loopDate.setMonth(loopDate.getMonth() + 1);
                    }
                }
            });
            await batch.commit();
        };
    
        generateBills();
    }, [customers, userId, initialBillsLoaded]); // `bills` is intentionally removed to prevent re-running on payment.

    const getCustomerById = useCallback((id: string) => customers.find(c => c.id === id), [customers]);
    
    const updateCustomer = useCallback(async (updatedCustomer: Customer): Promise<MutationResult> => {
        if(!userId) return { success: false, message: "User not authenticated." };
        try {
            const { id, ...data } = updatedCustomer;
            await updateDoc(doc(db, 'users', userId, 'customers', id), cleanData(data));
            return { success: true };
        } catch (error) {
            console.error("Error updating customer:", error);
            return { success: false, message: "Failed to update customer." };
        }
    }, [userId]);

    const addArea = useCallback(async (name: string): Promise<MutationResult> => {
        if (!userId) return { success: false, message: "User not authenticated." };
        if (!name || areas.some(a => a.name.toLowerCase() === name.toLowerCase())) {
            return { success: false, message: "Area already exists or name is invalid." };
        }
        try {
            await addDoc(collection(db, 'users', userId, 'areas'), { name });
            return { success: true };
        } catch (error) {
            console.error("Error adding area:", error);
            return { success: false, message: "Failed to add area." };
        }
    }, [userId, areas]);

    const deleteArea = useCallback(async (areaId: string): Promise<MutationResult> => {
        if(!userId) return { success: false, message: "User not authenticated." };
        try {
            await deleteDoc(doc(db, 'users', userId, 'areas', areaId));
            return { success: true };
        } catch (error) {
            console.error("Error deleting area:", error);
            return { success: false, message: "Failed to delete area." };
        }
    }, [userId]);

    const addCustomer = useCallback(async (customerData: Omit<Customer, 'id'|'openingDue'>, openingDue: number): Promise<MutationResult> => {
        if(!userId) return { success: false, message: "User not authenticated." };
        try {
            const newCustomerData = { ...customerData, openingDue };
            await addDoc(collection(db, 'users', userId, 'customers'), cleanData(newCustomerData));
            if (customerData.area && !areas.some(a => a.name === customerData.area)) {
                await addArea(customerData.area);
            }
            return { success: true };
        } catch (error) {
            console.error("Error adding customer:", error);
            return { success: false, message: "Failed to add customer." };
        }
    }, [userId, areas, addArea]);

    const deletePayment = useCallback(async (paymentId: string): Promise<MutationResult> => {
        if(!userId) return { success: false, message: "User not authenticated." };
        try {
            const paymentRef = doc(db, 'users', userId, 'payments', paymentId);
            const batch = writeBatch(db);

            const billsToUpdate = bills.filter(b => b.paymentId === paymentId);
            billsToUpdate.forEach(bill => {
                const billRef = doc(db, 'users', userId, 'bills', bill.id);
                batch.update(billRef, { status: BillStatus.UNPAID, paidDate: deleteField(), paymentId: deleteField() });
            });

            batch.delete(paymentRef);
            await batch.commit();
            return { success: true };
        } catch (error) {
            console.error("Error deleting payment:", error);
            return { success: false, message: "Failed to undo payment." };
        }
    }, [userId, bills]);


    const addPayment = useCallback(async (paymentData: Omit<Payment, 'id'>, billsToPay: Record<string, number>): Promise<MutationResult> => {
        if(!userId) return { success: false, message: "User not authenticated." };
        try {
            const batch = writeBatch(db);
            const paymentCollection = collection(db, 'users', userId, 'payments');
            const paymentRef = doc(paymentCollection); // Get ref with new ID
            batch.set(paymentRef, paymentData);

            const customerRef = doc(db, 'users', userId, 'customers', paymentData.customerId);
            const customerSnap = await getDoc(customerRef);
            if (!customerSnap.exists()) {
                throw new Error("Customer not found");
            }
            
            let totalDueDifference = 0;

            for (const billId of Object.keys(billsToPay)) {
                const originalBill = bills.find(b => b.id === billId);
                if (!originalBill) {
                    console.warn(`Original bill with ID ${billId} not found in local state.`);
                    continue;
                }
                const paidAmount = billsToPay[billId];
                const dueDifference = originalBill.amount - paidAmount;
                if (dueDifference > 0) {
                    totalDueDifference += dueDifference;
                }

                const billRef = doc(db, 'users', userId, 'bills', billId);
                batch.update(billRef, { status: BillStatus.PAID, paidDate: paymentData.date, paymentId: paymentRef.id });
            }

            if (totalDueDifference > 0) {
                const currentOpeningDue = customerSnap.data().openingDue || 0;
                const newOpeningDue = currentOpeningDue + totalDueDifference;
                batch.update(customerRef, { openingDue: newOpeningDue });
            }

            await batch.commit();
            return { success: true };
        } catch (error) {
            console.error("Error adding payment:", error);
            return { success: false, message: "Failed to add payment." };
        }
    }, [userId, bills]);

    const getPaymentsByCustomerId = useCallback((customerId: string) => {
        return payments.filter(p => p.customerId === customerId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [payments]);

    const getBillsByCustomerId = useCallback((customerId: string) => {
        return bills.filter(b => b.customerId === customerId).sort((a, b) => b.year - a.year || b.month - a.month);
    }, [bills]);


    const addDuePayment = useCallback(async (paymentData: Omit<DuePayment, 'id'>): Promise<MutationResult> => {
        if(!userId) return { success: false, message: "User not authenticated." };
        const customer = getCustomerById(paymentData.customerId);
        if (!customer) return { success: false, message: "Customer not found." };

        try {
            const batch = writeBatch(db);
            const duePaymentRef = doc(collection(db, 'users', userId, 'duePayments'));
            batch.set(duePaymentRef, paymentData);

            const customerRef = doc(db, 'users', userId, 'customers', customer.id);
            const newOpeningDue = customer.openingDue - paymentData.amount;
            batch.update(customerRef, { openingDue: newOpeningDue });

            await batch.commit();
            return { success: true };
        } catch (error) {
            console.error("Error adding due payment:", error);
            return { success: false, message: "Failed to add due payment." };
        }
    }, [userId, getCustomerById]);

    const updateDuePayment = useCallback(async (updatedPayment: DuePayment): Promise<MutationResult> => {
        if(!userId) return { success: false, message: "User not authenticated." };
        const originalPayment = duePayments.find(p => p.id === updatedPayment.id);
        const customer = getCustomerById(updatedPayment.customerId);
        if (!originalPayment || !customer) return { success: false, message: "Payment or customer not found." };

        try {
            const batch = writeBatch(db);
            const duePaymentRef = doc(db, 'users', userId, 'duePayments', updatedPayment.id);
            const { id, ...data } = updatedPayment;
            batch.update(duePaymentRef, data);

            const amountDifference = updatedPayment.amount - originalPayment.amount;
            const newOpeningDue = customer.openingDue - amountDifference;
            const customerRef = doc(db, 'users', userId, 'customers', customer.id);
            batch.update(customerRef, { openingDue: newOpeningDue });
            
            await batch.commit();
            return { success: true };
        } catch (error) {
            console.error("Error updating due payment:", error);
            return { success: false, message: "Failed to update due payment." };
        }
    }, [userId, duePayments, getCustomerById]);

    const deleteDuePayment = useCallback(async (paymentId: string): Promise<MutationResult> => {
        if(!userId) return { success: false, message: "User not authenticated." };
        const paymentToDelete = duePayments.find(p => p.id === paymentId);
        const customer = paymentToDelete ? getCustomerById(paymentToDelete.customerId) : undefined;
        if (!paymentToDelete || !customer) return { success: false, message: "Payment or customer not found." };

        try {
            const batch = writeBatch(db);
            const duePaymentRef = doc(db, 'users', userId, 'duePayments', paymentId);
            batch.delete(duePaymentRef);

            const newOpeningDue = customer.openingDue + paymentToDelete.amount;
            const customerRef = doc(db, 'users', userId, 'customers', customer.id);
            batch.update(customerRef, { openingDue: newOpeningDue });

            await batch.commit();
            return { success: true };
        } catch (error) {
            console.error("Error deleting due payment:", error);
            return { success: false, message: "Failed to delete due payment." };
        }
    }, [userId, duePayments, getCustomerById]);

    const getDuePaymentsByCustomerId = useCallback((customerId: string) => {
        return duePayments.filter(p => p.customerId === customerId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [duePayments]);
    
    const deleteCustomer = useCallback(async (customerId: string): Promise<MutationResult> => {
        if(!userId) return { success: false, message: "User not authenticated." };
        try {
            const batch = writeBatch(db);
            
            // Delete related data
            payments.filter(p => p.customerId === customerId).forEach(p => batch.delete(doc(db, 'users', userId, 'payments', p.id)));
            duePayments.filter(p => p.customerId === customerId).forEach(p => batch.delete(doc(db, 'users', userId, 'duePayments', p.id)));
            bills.filter(b => b.customerId === customerId).forEach(b => batch.delete(doc(db, 'users', userId, 'bills', b.id)));
            
            // Delete customer
            batch.delete(doc(db, 'users', userId, 'customers', customerId));
            
            await batch.commit();
            return { success: true };
        } catch (error) {
            console.error("Error deleting customer:", error);
            return { success: false, message: "Failed to delete customer." };
        }
    }, [userId, payments, duePayments, bills]);

    const submitSubscriptionRequest = useCallback(async (data: { senderPhone: string; transactionId: string }): Promise<MutationResult> => {
        if (!userId) { return { success: false, message: "User not authenticated." }; }
        try {
            const userRef = doc(db, 'users', userId);
            
            const requestPayload = {
                senderPhone: data.senderPhone,
                transactionId: data.transactionId,
                requestDate: new Date().toISOString(),
            };

            await updateDoc(userRef, {
                subscriptionStatus: 'pending',
                subscriptionRequest: requestPayload
            });

            return { success: true };
        } catch (error) {
            console.error("Error submitting subscription request:", error);
            return { success: false, message: "Failed to submit request." };
        }
    }, [userId]);


    const value = useMemo(() => ({
        customers, payments, areas, duePayments, bills, addCustomer, updateCustomer,
        deleteCustomer, getCustomerById, addPayment, deletePayment, getPaymentsByCustomerId,
        addArea, deleteArea, addDuePayment, updateDuePayment, deleteDuePayment,
        getDuePaymentsByCustomerId, getBillsByCustomerId, submitSubscriptionRequest,
    }), [
        customers, payments, areas, duePayments, bills, addCustomer, updateCustomer,
        deleteCustomer, getCustomerById, addPayment, deletePayment, getPaymentsByCustomerId,
        addArea, deleteArea, addDuePayment, updateDuePayment, deleteDuePayment,
        getDuePaymentsByCustomerId, getBillsByCustomerId, submitSubscriptionRequest
    ]);

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};

// Filter Context for persisting customer list filters
interface FilterContextType {
    customerSearchTerm: string;
    setCustomerSearchTerm: (term: string) => void;
    customerAreaFilter: string;
    setCustomerAreaFilter: (area: string) => void;
    customerStatusFilter: string;
    setCustomerStatusFilter: (status: string) => void;
}
export const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const [customerAreaFilter, setCustomerAreaFilter] = useState('all');
    const [customerStatusFilter, setCustomerStatusFilter] = useState('all');

    const value = useMemo(() => ({
        customerSearchTerm, setCustomerSearchTerm,
        customerAreaFilter, setCustomerAreaFilter,
        customerStatusFilter, setCustomerStatusFilter
    }), [customerSearchTerm, customerAreaFilter, customerStatusFilter]);

    return (
        <FilterContext.Provider value={value}>
            {children}
        </FilterContext.Provider>
    );
};

export const useFilters = () => {
    const context = useContext(FilterContext);
    if (!context) {
        throw new Error('useFilters must be used within a FilterProvider');
    }
    return context;
};


// App Context Provider
export const AppContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <ThemeProvider>
            <LanguageProvider>
                <AuthProvider>
                    <DataProvider>
                        <FilterProvider>
                            {children}
                        </FilterProvider>
                    </DataProvider>
                </AuthProvider>
            </LanguageProvider>
        </ThemeProvider>
    );
};