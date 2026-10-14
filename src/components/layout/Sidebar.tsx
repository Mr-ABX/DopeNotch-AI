import React from 'react';
import {
  Sparkles,
  Mic,
  ClipboardList,
  Terminal,
  Sliders,
} from 'lucide-react';
import { useAppStore, SidebarTab } from '../../stores/appStore';

interface NavItem {
  id: SidebarTab;
  label: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'welcome', label: 'Overview', icon: Sparkles },
  { id: 'voiceEngine', label: 'Voice Engine', icon: Mic },
  { id: 'history', label: 'Clipboard & History', icon: ClipboardList },
  { id: 'commandMode', label: 'Command Mode', icon: Terminal },
  { id: 'preferences', label: 'Preferences', icon: Sliders },
];

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab } = useAppStore();

  return (
    <aside className="w-56 h-full flex flex-col justify-between bg-[#0a0a0c] border-r border-[#1e1e24] select-none p-3">
      <div>
        {/* App Branding */}
        <div className="flex items-center gap-2.5 px-2.5 py-2.5 mb-3" data-tauri-drag-region>
          <div className="w-6 h-6 rounded-lg overflow-hidden shadow-sm border border-white/10 flex-none">
            <img src="/logo.png" alt="DopeNotch" className="w-full h-full object-cover" />
          </div>
          <div data-tauri-drag-region>
            <h1 className="text-xs font-semibold text-white tracking-tight leading-none" data-tauri-drag-region>
              DopeNotch
            </h1>
            <p className="text-[10px] text-zinc-500 mt-0.5" data-tauri-drag-region>
              Voice & Clipboard
            </p>
          </div>
        </div>

        {/* Navigation Item List */}
        <nav className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              activeTab === item.id ||
              (item.id === 'voiceEngine' && (activeTab === 'aiSettings' || activeTab === 'aiEnhancements')) ||
              (item.id === 'history' && (activeTab === 'fileTranscription' || activeTab === 'meetingTools')) ||
              (item.id === 'commandMode' && (activeTab === 'writeMode' || activeTab === 'rewriteMode' || activeTab === 'cleanupStyles'));

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-black font-semibold'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 transition-colors ${
                    isActive ? 'text-black' : 'text-zinc-400'
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="px-2.5 py-2 border-t border-[#1e1e24] text-[10px] text-zinc-500 flex items-center justify-between font-mono">
        <span>v0.4.0</span>
        <span className="flex items-center gap-1.5 text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          Offline
        </span>
      </div>
    </aside>
  );
};
