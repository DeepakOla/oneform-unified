import { useState, useEffect } from 'react';
import { Settings, User, FileText, CheckCircle, RefreshCw } from 'lucide-react';

export function PopupApp() {
  const [status, setStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const [profile, setProfile] = useState<{ name: string; type: string } | null>(null);

  useEffect(() => {
    // Determine connection state from Vault/Background
    chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
      if (response && response.user) {
        setStatus('connected');
        setProfile({ name: response.user.displayName || 'Guest User', type: 'CITIZEN' });
      }
    });
  }, []);

  return (
    <div className="w-[350px] min-h-[400px] bg-white text-slate-900 font-sans flex flex-col">
      <header className="bg-blue-600 text-white p-4 flex justify-between items-center shadow-md">
        <div className="flex items-center space-x-2">
          <img src="/icons/icon48.png" alt="Logo" className="w-6 h-6" />
          <h1 className="text-lg font-bold tracking-tight">OneForm</h1>
        </div>
        <button className="p-1 hover:bg-blue-700 rounded-full transition-colors">
          <Settings className="w-5 h-5 text-blue-100" />
        </button>
      </header>

      <main className="flex-1 p-4 flex flex-col items-center">
        {status === 'disconnected' ? (
          <div className="flex flex-col items-center justify-center h-full mt-10 space-y-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-center text-sm text-slate-600">
              Link your OneForm account to enable AI autofill on government portals.
            </p>
            <button 
              className="mt-2 text-white bg-blue-600 hover:bg-blue-700 font-medium px-4 py-2 rounded-md shadow-sm transition-all"
              onClick={() => chrome.tabs.create({ url: 'https://indianform.com/login' })}
            >
              Connect Account
            </button>
          </div>
        ) : (
          <div className="w-full flex flex-col space-y-4">
            <div className="bg-green-50 text-green-800 border-l-4 border-green-500 p-3 rounded-r-md flex items-center space-x-2">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium text-sm">Connected as {profile?.name}</span>
            </div>

            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Available Profiles</h3>
              <div className="space-y-2">
                 <div className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded text-sm hover:border-blue-400 cursor-pointer transition-colors shadow-sm">
                   <div className="flex items-center space-x-2">
                     <FileText className="w-4 h-4 text-blue-500" />
                     <span>Default Profile</span>
                   </div>
                   <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{profile?.type}</span>
                 </div>
              </div>
            </div>

            <div className="mt-auto">
              <button className="w-full flex justify-center items-center space-x-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 py-2 rounded-md transition-colors text-sm font-medium">
                <RefreshCw className="w-4 h-4" />
                <span>Sync Latest Data</span>
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-slate-50 border-t border-slate-200 p-2 text-center text-xs text-slate-500">
        <a href="#" className="hover:text-blue-600 transition-colors">Go to Dashboard</a>
      </footer>
    </div>
  );
}
