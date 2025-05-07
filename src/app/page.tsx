"use client";
import { useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";

// Define a proper type for user data
interface UserData {
   id?: string;
   name?: string;
   email: string;
   companyName?: string;
   items?: Array<{
      itemname: string;
      itemcode: string;
      createdat?: string;
   }>;
}

// Component for displaying items table
const ItemsTable = ({ items }: { items: UserData['items'] }) => {
   if (!items || items.length === 0) {
      return <p>No items data available for this company.</p>;
   }

   return (
      <div className="items-container">
         <h2>Company Items:</h2>
         <table className="items-table">
            <thead>
               <tr>
                  <th>Item Name</th>
                  <th>Item Code</th>
                  <th>Created At</th>
               </tr>
            </thead>
            <tbody>
               {items.map((item, index) => (
                  <tr key={index}>
                     <td>{item.itemname}</td>
                     <td>{item.itemcode}</td>
                     <td>{item.createdat ? new Date(item.createdat).toLocaleString() : 'N/A'}</td>
                  </tr>
               ))}
            </tbody>
         </table>
      </div>
   );
};

export default function Home() {
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const { isLoggedIn, user, login, logout } = useAuth();
   const formRef = useRef<HTMLFormElement>(null);

   async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
      event.preventDefault();
      setIsSubmitting(true);
      setError(null);

      const formData = new FormData(event.currentTarget);
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;

      try {
         const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
         });

         const data = await response.json();

         if (!response.ok) {
            throw new Error(data.message || 'Authentication failed');
         }

         login(data.user);
         console.log('Retrieved user data:', data.user);
         formRef.current?.reset();
      } catch (error) {
         console.error('Error:', error);
         setError(error instanceof Error ? error.message : 'Login failed');
      } finally {
         setIsSubmitting(false);
      }
   }

   if (isLoggedIn && user) {
      return (
         <div className="login-success">
            <h1>Welcome, {user.name || user.email}!</h1>
            <p>You have successfully logged in.</p>
            <div className="user-info">
               <p><strong>Email:</strong> {user.email}</p>
               <p><strong>Company:</strong> {user.companyName || 'No company assigned'}</p>
               <ItemsTable items={user.items} />
            </div>
            <button onClick={logout}>Log out</button>
         </div>
      );
   }

   return (
      <div className="login-container">
         <h1>Login</h1>
         <p>Please enter your credentials to access your account.</p>
         {error && <div className="error-message">{error}</div>}
         <form ref={formRef} onSubmit={handleSubmit}>
            <div className="form-group">
               <label htmlFor="email">Email</label>
               <input
                  type="email"
                  id="email"
                  placeholder="Enter your email"
                  name="email"
                  required
               />
            </div>
            <div className="form-group">
               <label htmlFor="password">Password</label>
               <input
                  type="password"
                  id="password"
                  placeholder="Enter your password"
                  name="password"
                  required
               />
            </div>
            <button type="submit" disabled={isSubmitting}>
               {isSubmitting ? 'Logging in...' : 'Login'}
            </button>
         </form>
      </div>
   );
}
