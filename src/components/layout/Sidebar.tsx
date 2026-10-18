import React from 'react';
import {
  Sparkles,
  Mic,
  Bot,
  ClipboardList,
  FileText,
  Blocks,
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
  { id: 'aiSettings', label: 'AI Models & Vision', icon: Bot },
  { id: 'history', label: 'Clipboard & History', icon: ClipboardList },
  { id: 'notes', label: 'Voice Notes', icon: FileText },
  { id: 'extensions', label: 'Extensions', icon: Blocks },
  { id: 'commandMode', label: 'Command Mode', icon: Terminal },
  { id: 'preferences', label: 'Preferences', icon: Sliders },
];

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab } = useAppStore();

  return (
    <aside className="w-60 h-full flex flex-col justify-between bg-[#0a0a0c] border-r border-[#1e1e24] select-none p-3.5">
      <div>
        {/* App Branding */}
        <div className="flex items-center gap-3 px-3 py-2.5 mb-4" data-tauri-drag-region>
          <div className="w-7 h-7 rounded-xl overflow-hidden shadow-sm border border-white/10 flex-none">
            <img src="/logo.png" alt="DopeNotch" className="w-full h-full object-cover" />
          </div>
          <div data-tauri-drag-region>
            <h1 className="text-sm font-semibold text-white tracking-tight leading-none" data-tauri-drag-region>
              DopeNotch
            </h1>
            <p className="text-[11px] text-zinc-500 mt-1" data-tauri-drag-region>
              Voice & Clipboard
            </p>
          </div>
        </div>

        {/* Navigation Item List */}
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              activeTab === item.id ||
              (item.id === 'aiSettings' && activeTab === 'aiEnhancements') ||
              (item.id === 'history' && (activeTab === 'fileTranscription' || activeTab === 'meetingTools')) ||
              (item.id === 'commandMode' && (activeTab === 'writeMode' || activeTab === 'rewriteMode' || activeTab === 'cleanupStyles'));

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-black font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <Icon
                  className={`w-4 h-4 transition-colors ${
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
      <div className="px-3 py-2.5 border-t border-[#1e1e24] text-[11px] text-zinc-500 flex items-center justify-between font-mono">
        <span>v0.4.0</span>
        <span className="flex items-center gap-1.5 text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          Offline
        </span>
      </div>
    </aside>
  );
};
