import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { motion } from 'motion/react';
import { LogIn, UserPlus, Briefcase, GraduationCap, ShieldCheck } from 'lucide-react';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'student' | 'company' | 'admin'>('student');
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const body = isLogin ? { email, password } : { name, email, password, role };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');

      if (isLogin) {
        login(data.token, data.user);
        navigate('/');
      } else {
        setIsLogin(true);
        setError('Registration successful! Please login.');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-100 p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-stone-200"
      >
        <div className="flex justify-center mb-6">
          <div className="bg-indigo-600 p-3 rounded-xl text-white">
            <Briefcase size={32} />
          </div>
        </div>
        
        <h2 className="text-3xl font-bold text-center text-stone-900 mb-2">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className="text-stone-500 text-center mb-8">
          {isLogin ? 'Sign in to access the Smart Allocation Engine' : 'Join the PM Internship Scheme platform'}
        </p>

        {error && (
          <div className={`p-3 rounded-lg mb-4 text-sm ${error.includes('successful') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">I am a...</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  className={`flex flex-col items-center p-3 rounded-xl border transition-all ${role === 'student' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-stone-200 text-stone-500'}`}
                >
                  <GraduationCap size={20} />
                  <span className="text-xs mt-1">Student</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('company')}
                  className={`flex flex-col items-center p-3 rounded-xl border transition-all ${role === 'company' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-stone-200 text-stone-500'}`}
                >
                  <Briefcase size={20} />
                  <span className="text-xs mt-1">Company</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`flex flex-col items-center p-3 rounded-xl border transition-all ${role === 'admin' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-stone-200 text-stone-500'}`}
                >
                  <ShieldCheck size={20} />
                  <span className="text-xs mt-1">Admin</span>
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white p-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
          >
            {isLogin ? <LogIn size={20} /> : <UserPlus size={20} />}
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-indigo-600 text-sm font-medium hover:underline"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
