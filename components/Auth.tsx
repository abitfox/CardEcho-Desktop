
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
      <div className="mb-12 flex flex-col items-center">
        {/* REDESIGNED LOGO FOR AUTH SCREEN */}
        <div className="relative mb-6">
           <div className="absolute inset-0 bg-blue-600/20 blur-3xl rounded-full scale-110"></div>
           <div className="relative w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-[28px] shadow-[0_20px_40px_rgba(37,99,235,0.3)] flex items-end justify-center gap-[4px] p-5 overflow-hidden">
              <div className="w-2.5 h-6 bg-white/40 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-2.5 h-10 bg-white rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-2.5 h-7 bg-white/70 rounded-full animate-bounce"></div>
              <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-white/20 to-transparent pointer-events-none"></div>
           </div>
        </div>
        
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">CardEcho</h1>
        <div className="flex items-center gap-2 mt-2">
           <span className="h-[1px] w-4 bg-gray-200"></span>
           <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em]">Master languages with AI</p>
           <span className="h-[1px] w-4 bg-gray-200"></span>
        </div>
      </div>

      <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl border border-gray-100 p-12 relative overflow-hidden">
        {/* Subtle decorative background gradient */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-50/50 rounded-full blur-3xl"></div>
        
        <h2 className="text-2xl font-black mb-8 text-center text-gray-900 relative z-10">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-wider rounded-2xl border border-red-100 leading-relaxed relative z-10">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          {!isLogin && (
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Full Name</label>
              <input 
                type="text" 
                required 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="What's your name?"
                className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-medium text-sm"
              />
            </div>
          )}
          
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-medium text-sm"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Password</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-medium text-sm"
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
            <label htmlFor="rememberMe" className="text-xs text-gray-400 font-bold uppercase tracking-wider cursor-pointer">
              Remember me
            </label>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
          >
            {isLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
            {isLoading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="mt-10 text-center border-t border-gray-50 pt-8 relative z-10">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
            {isLogin ? "New to CardEcho?" : "Already have an account?"}{' '}
            <button 
              onClick={() => {setIsLogin(!isLogin); setError('');}}
              className="text-blue-600 font-black hover:underline"
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
