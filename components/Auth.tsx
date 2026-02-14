
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { cloudService } from '../services/cloudService';

interface AuthProps {
  onLogin: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('kimi@qq.com');
  const [password, setPassword] = useState('111111');
  const [name, setName] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem('cardecho_remembered_email');
    const savedPassword = localStorage.getItem('cardecho_remembered_password');
    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      if (rememberMe) {
        localStorage.setItem('cardecho_remembered_email', email);
        localStorage.setItem('cardecho_remembered_password', password);
      } else {
        localStorage.removeItem('cardecho_remembered_email');
        localStorage.removeItem('cardecho_remembered_password');
      }

      if (isLogin) {
        // --- 登录逻辑 ---
        try {
          const user = await cloudService.signIn(email, password);
          if (!user) {
            setError('Account not found or invalid credentials.');
          } else {
            onLogin(user);
          }
        } catch (err: any) {
          setError(err.message || 'Invalid email or password.');
          console.error("Login error:", err);
        }
      } else {
        // --- 注册逻辑 ---
        try {
            const tempUser: User = {
                id: crypto.randomUUID(), 
                email,
                name: name || email.split('@')[0],
                avatar: `https://ui-avatars.com/api/?name=${email}&background=random`
            };
            const profile = await cloudService.signUp(tempUser, password);
            if (profile) {
              onLogin(profile);
            } else {
              setError('Registration succeeded but profile creation failed.');
            }
        } catch (err: any) {
            setError(err.message || 'Registration failed.');
            console.error("Signup error:", err);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center p-6">
      <div className="mb-8 flex flex-col items-center">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl mb-4">
          <span className="text-white text-3xl font-bold italic">CE</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">CardEcho</h1>
        <p className="text-gray-500 text-sm">Master languages with AI & Cloud sync.</p>
      </div>

      <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl border border-gray-100 p-12">
        <h2 className="text-2xl font-bold mb-8 text-center text-gray-800">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 text-xs font-bold rounded-2xl border border-red-100 leading-relaxed">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Full Name</label>
              <input 
                type="text" 
                required 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="What's your name?"
                className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition-all"
              />
            </div>
          )}
          
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Password</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition-all"
            />
          </div>

          <div className="flex items-center gap-2 py-2">
            <input 
              type="checkbox" 
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded-lg focus:ring-blue-500"
            />
            <label htmlFor="rememberMe" className="text-sm text-gray-500 font-medium cursor-pointer">
              Remember me
            </label>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
          >
            {isLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
            {isLoading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="mt-10 text-center border-t border-gray-50 pt-8">
          <p className="text-sm text-gray-400 font-medium">
            {isLogin ? "New to CardEcho?" : "Already have an account?"}{' '}
            <button 
              onClick={() => {setIsLogin(!isLogin); setError('');}}
              className="text-blue-600 font-bold hover:underline"
            >
              {isLogin ? 'Create Account' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
