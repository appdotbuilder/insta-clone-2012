import './App.css';
import { useState, useEffect } from 'react';
import { trpc } from '@/utils/trpc';
// Using type-only imports for better TypeScript compliance
import type { PublicUser } from '../../server/src/schema';

// Import components
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { Feed } from './components/Feed';
import { Profile } from './components/Profile';
import { Header } from './components/Header';
import { PostUpload } from './components/PostUpload';

function App() {
  // Current user state
  const [currentUser, setCurrentUser] = useState<PublicUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Navigation state
  const [activeTab, setActiveTab] = useState<'feed' | 'profile' | 'upload'>('feed');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Check for existing user session (in real app, this would check localStorage/JWT)
  useEffect(() => {
    // For demo purposes, we'll start logged out
    // In a real app, you'd check for stored auth tokens here
  }, []);

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const user = await trpc.loginUser.mutate({ email, password });
      setCurrentUser(user);
    } catch (error) {
      console.error('Login failed:', error);
      // In a real app, you'd show error messages to the user
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (username: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const user = await trpc.registerUser.mutate({ username, email, password });
      setCurrentUser(user);
    } catch (error) {
      console.error('Registration failed:', error);
      // In a real app, you'd show error messages to the user
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('feed');
  };

  // If user is not logged in, show auth forms
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Billabong, cursive' }}>
              📸 Instapic
            </h1>
            <p className="text-gray-600">Share your moments</p>
          </div>

          {/* Auth Forms */}
          <div className="bg-white p-8 rounded-lg shadow-md border">
            {authMode === 'login' ? (
              <>
                <LoginForm onLogin={handleLogin} isLoading={isLoading} />
                <div className="text-center mt-6">
                  <span className="text-gray-600">Don't have an account? </span>
                  <button
                    onClick={() => setAuthMode('register')}
                    className="text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    Sign up
                  </button>
                </div>
              </>
            ) : (
              <>
                <RegisterForm onRegister={handleRegister} isLoading={isLoading} />
                <div className="text-center mt-6">
                  <span className="text-gray-600">Already have an account? </span>
                  <button
                    onClick={() => setAuthMode('login')}
                    className="text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    Log in
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main app interface for logged-in users
  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        currentUser={currentUser} 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
      />

      <main className="pt-16">
        {activeTab === 'feed' && <Feed currentUser={currentUser} />}
        {activeTab === 'profile' && <Profile currentUser={currentUser} />}
        {activeTab === 'upload' && (
          <PostUpload 
            currentUser={currentUser} 
            onUploadComplete={() => setActiveTab('feed')} 
          />
        )}
      </main>
    </div>
  );
}

export default App;