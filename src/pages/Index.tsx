import { useState, useEffect } from 'react';
import { LoginPage } from '@/components/auth/LoginPage';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { ExcalidrawEditor } from '@/components/editor/ExcalidrawEditor';
import { useAuth } from 'react-oidc-context';
import { StorageService } from '@/services/storage.service';
import { useLocalStorage } from 'usehooks-ts';

type AppState = '' | 'dashboard' | 'editor';

const Index = () => {
  const [appState, setAppStateVar] = useState<AppState>('');
  
  const [currentFileId, setCurrentFileId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  const [ locallyLoggedIn, setLocallyLoggedIn ] = useLocalStorage<boolean>('locallyLoggedIn', false);
  
  const auth = useAuth();

  const storageService = new StorageService(auth.user?.access_token || '');

  const setAppState = (state: AppState) => {
    setAppStateVar(state);
  }
  
  useEffect(() => {
    const checkAuth = () => {
      if ( auth.isAuthenticated || locallyLoggedIn ) {
        if (auth.isAuthenticated || locallyLoggedIn) {
          storageService.setAuthKey(auth.user?.access_token || '');
        }
        if (appState === '') {
          setAppState('dashboard');
        }        
      } else {
        if (appState !== '') {
          setAppState('');
        }
      }

      if (!auth.isLoading && !auth.isAuthenticated && import.meta.env.MODE === 'cloudflare') {
        setLocallyLoggedIn(false);
        setAppState('');
      }

      setIsLoading(false);
    };

    checkAuth();
  }, [ auth.isLoading, auth.isAuthenticated, locallyLoggedIn ]);

  const handleLogout = () => {
    setAppState('');
    setLocallyLoggedIn(false);
    if (auth.isAuthenticated) {
      auth.signoutPopup();
    }
    setCurrentFileId(undefined);
  };

  const handleOpenEditor = (fileId?: string) => {
    setCurrentFileId(fileId);
    setAppState('editor');
  };

  const handleBackToDashboard = () => {
    setCurrentFileId(undefined);
    setAppState('dashboard');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  switch (appState) {
    case '':
      return <LoginPage doAuth={() => auth.signinPopup()} doGuestAuth={() => setLocallyLoggedIn(true)} />;
    
    case 'dashboard':
      return (
        <Dashboard 
          onOpenEditor={handleOpenEditor}
          onLogout={handleLogout}
          storageService={storageService}
        />
      );
    
    case 'editor':
      return (
        <ExcalidrawEditor 
          fileId={currentFileId}
          onBack={handleBackToDashboard}
          storageService={storageService}
          userId={auth.user?.profile.email}
        />
      );
    
    default:
      return null;
  }
};

export default Index;
