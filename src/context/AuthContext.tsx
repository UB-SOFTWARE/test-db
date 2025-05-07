"use client";
import { createContext, useState, useContext, useEffect, ReactNode } from 'react';

// Define the user data interface
interface UserData {
   id?: string;
   name?: string;
   email: string;
   companyName?: string;
   items?: Array<{
      itemname: string;
      itemcode: string;
      createdat?: string;
      [key: string]: any;
   }>;
   [key: string]: any;
}

// Define the auth context interface
interface AuthContextType {
   user: UserData | null;
   isLoggedIn: boolean;
   items: Array<any>;
   login: (userData: UserData) => void;
   logout: () => void;
   refreshItems: () => Promise<void>;
}

// Create the auth context with default values
const AuthContext = createContext<AuthContextType>({
   user: null,
   isLoggedIn: false,
   items: [],
   login: () => { },
   logout: () => { },
   refreshItems: async () => { },
});

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// Helper function to handle local storage
const storage = {
   getUser: (): UserData | null => {
      const storedUser = localStorage.getItem('user');
      return storedUser ? JSON.parse(storedUser) : null;
   },
   setUser: (user: UserData | null) => {
      if (user) {
         localStorage.setItem('user', JSON.stringify(user));
         localStorage.setItem('isLoggedIn', 'true');
      } else {
         localStorage.removeItem('user');
         localStorage.removeItem('isLoggedIn');
      }
   },
   isLoggedIn: (): boolean => {
      return localStorage.getItem('isLoggedIn') === 'true';
   }
};

// Auth provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
   const [user, setUser] = useState<UserData | null>(null);
   const [isLoggedIn, setIsLoggedIn] = useState(false);
   const [isLoading, setIsLoading] = useState(true);
   const [items, setItems] = useState<Array<any>>([]);

   // Function to fetch items from the API
   const refreshItems = async () => {
      if (!user?.companyName) return;

      try {
         const response = await fetch(`/api/items/getItems?companyName=${encodeURIComponent(user.companyName)}`);
         const data = await response.json();

         if (!response.ok) {
            console.error('Error fetching items:', data.message);
            return;
         }

         if (data.success && Array.isArray(data.items)) {
            setItems(data.items);

            // Update user data with the latest items
            const updatedUser = { ...user, items: data.items };
            setUser(updatedUser);
            storage.setUser(updatedUser);
         }
      } catch (error) {
         console.error('Error fetching items:', error);
      }
   };

   // Load user data from localStorage on initial render
   useEffect(() => {
      const storedUser = storage.getUser();
      const storedLoginState = storage.isLoggedIn();

      if (storedUser && storedLoginState) {
         setUser(storedUser);
         setIsLoggedIn(true);
         setItems(storedUser.items || []);
      }

      setIsLoading(false);
   }, []);

   // Fetch items whenever the user is logged in with a company name
   useEffect(() => {
      if (isLoggedIn && user?.companyName) {
         refreshItems();
      }
   }, [isLoggedIn, user?.companyName]);

   // Login function
   const login = (userData: UserData) => {
      setUser(userData);
      setIsLoggedIn(true);
      storage.setUser(userData);
      setItems(userData.items || []);
   };

   // Logout function
   const logout = () => {
      setUser(null);
      setIsLoggedIn(false);
      setItems([]);
      storage.setUser(null);
   };

   // Provide a loading state to prevent flickering
   if (isLoading) {
      return <div>Loading...</div>;
   }

   return (
      <AuthContext.Provider value={{ user, isLoggedIn, items, login, logout, refreshItems }}>
         {children}
      </AuthContext.Provider>
   );
};
