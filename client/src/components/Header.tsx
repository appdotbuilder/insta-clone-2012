import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { PublicUser } from '../../../server/src/schema';

interface HeaderProps {
  currentUser: PublicUser;
  activeTab: 'feed' | 'profile' | 'upload';
  onTabChange: (tab: 'feed' | 'profile' | 'upload') => void;
  onLogout: () => void;
}

export function Header({ currentUser, activeTab, onTabChange, onLogout }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-300 z-50">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center">
          <h1 
            className="text-2xl font-bold text-gray-900 cursor-pointer"
            style={{ fontFamily: 'Billabong, cursive' }}
            onClick={() => onTabChange('feed')}
          >
            📸 Instapic
          </h1>
        </div>

        {/* Navigation */}
        <nav className="flex items-center space-x-6">
          <button
            onClick={() => onTabChange('feed')}
            className={`p-2 ${activeTab === 'feed' ? 'text-black' : 'text-gray-500 hover:text-gray-700'}`}
            title="Home"
          >
            🏠
          </button>
          
          <button
            onClick={() => onTabChange('upload')}
            className={`p-2 ${activeTab === 'upload' ? 'text-black' : 'text-gray-500 hover:text-gray-700'}`}
            title="Upload"
          >
            ➕
          </button>

          <button
            onClick={() => onTabChange('profile')}
            className={`flex items-center ${activeTab === 'profile' ? 'text-black' : 'text-gray-500 hover:text-gray-700'}`}
            title="Profile"
          >
            <Avatar className="w-8 h-8">
              <AvatarImage src={currentUser.profile_picture_url || undefined} />
              <AvatarFallback className="bg-gray-200 text-gray-700 text-sm">
                {currentUser.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </button>

          <Button
            onClick={onLogout}
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-gray-700"
          >
            Logout
          </Button>
        </nav>
      </div>
    </header>
  );
}