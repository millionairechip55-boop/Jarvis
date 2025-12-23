import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import GoogleAccountChooser from './GoogleAccountChooser';

interface LoginScreenProps {
  onLogin: (email: string) => void;
}

const GoogleIcon = () => (
    <svg className="w-5 h-5 mr-3" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path>
        <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"></path>
        <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.223 0-9.641-3.657-11.303-8.653l-6.522 5.025C9.505 39.556 16.227 44 24 44z"></path>
        <path fill="#1976D2" d="M43.611 20.083H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C43.021 36.251 46 30.561 46 24c0-1.341-.138-2.65-.389-3.917z"></path>
    </svg>
);


const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGoogleChooser, setShowGoogleChooser] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Realistic validation: any non-empty email is fine, but password must be 'password123'
    if (email && password === 'password123') {
      onLogin(email);
    } else {
      setError('Invalid email or password. Please try again.');
    }
  };

  const handleGoogleLogin = () => {
      setShowGoogleChooser(true);
  }

  const handleSelectGoogleAccount = () => {
    setShowGoogleChooser(false);
    onLogin(email);
  }

  return (
    <>
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-8">
        <div className="w-full max-w-sm">
          <div className="text-left text-gray-500 dark:text-gray-400 text-sm mb-6">
            <p>Only login via email, Google, or +86 phone number login is supported in your region.</p>
          </div>
          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-gray-800 p-0"
          >
            <div className="relative mb-4">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Phone number / email address"
                required
                className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-50 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="relative mb-4">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type={passwordVisible ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full pl-12 pr-12 py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-50 dark:bg-gray-700 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setPasswordVisible(!passwordVisible)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label={passwordVisible ? 'Hide password' : 'Show password'}
              >
                {passwordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {error && (
              <div className="flex items-center p-3 mb-4 text-sm text-red-700 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400" role="alert">
                <AlertCircle className="flex-shrink-0 inline w-4 h-4 mr-3" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <div className="text-xs text-gray-500 dark:text-gray-400 mb-6">
              By signing up or logging in, you consent to DeepSeek's 
              <a href="#" className=" text-primary-600 hover:text-primary-700"> Terms of Use </a> 
              and 
              <a href="#" className=" text-primary-600 hover:text-primary-700"> Privacy Policy</a>.
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-300 mb-4"
            >
              Log in
            </button>

            <div className="flex justify-between text-sm text-primary-600 mb-6">
              <a href="#" className="hover:underline">Forgot password?</a>
              <a href="#" className="hover:underline">Sign up</a>
            </div>

            <div className="flex items-center my-6">
              <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
              <span className="flex-shrink mx-4 text-gray-400 dark:text-gray-500 text-xs">OR</span>
              <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
            </div>
            
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-300 font-medium"
            >
              <GoogleIcon />
              Log in with Google
            </button>
          </form>
        </div>
      </div>
      <GoogleAccountChooser 
        isOpen={showGoogleChooser} 
        onClose={() => setShowGoogleChooser(false)} 
        onSelectAccount={handleSelectGoogleAccount}
        email={email}
      />
    </>
  );
};

export default LoginScreen;