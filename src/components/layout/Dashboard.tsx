import React from 'react';
import { useAppStore } from '../../stores/appStore';
import { Sidebar } from './Sidebar';
import { TitleBar } from './TitleBar';
import { WelcomeView } from '../views/WelcomeView';
import { VoiceEngineView } from '../views/VoiceEngineView';
import { AIEnhancementsView } from '../views/AIEnhancementsView';
import { CommandModeView } from '../views/CommandModeView';
import { TranscriptionHistoryView } from '../views/TranscriptionHistoryView';
import { PreferencesView } from '../views/PreferencesView';
import { ExtensionsView } from '../views/ExtensionsView';
import { NotesView } from '../views/NotesView';
import { SettingsModal } from '../settings/SettingsModal';

export const Dashboard: React.FC = () => {
  const { activeTab } = useAppStore();

  const renderActiveView = () => {
    switch (activeTab) {
      case 'welcome':
        return <WelcomeView />;
      case 'voiceEngine':
        return <VoiceEngineView />;
      case 'aiSettings':
      case 'aiEnhancements':
        return <AIEnhancementsView />;
      case 'history':
      case 'fileTranscription':
      case 'meetingTools':
        return <TranscriptionHistoryView />;
      case 'notes':
        return <NotesView />;
      case 'extensions':
        return <ExtensionsView />;
      case 'commandMode':
      case 'writeMode':
      case 'rewriteMode':
      case 'cleanupStyles':
      case 'customDictionary':
        return <CommandModeView />;
      case 'preferences':
      case 'stats':
      case 'changelog':
      case 'feedback':
        return <PreferencesView />;
      default:
        return <WelcomeView />;
    }
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-[#000000] text-[#ededed] overflow-hidden select-none">
      {/* Main App Titlebar */}
      <TitleBar />

      {/* Main App Body Split (Sidebar + Active View) */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 h-full overflow-hidden bg-[#000000] flex flex-col">
          {renderActiveView()}
        </main>
      </div>

      {/* Preferences Modal */}
      <SettingsModal />
    </div>
  );
};
