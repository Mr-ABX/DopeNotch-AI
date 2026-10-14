import React from 'react';
import {
  PlayCircle,
  Mic,
  ClipboardList,
  Sparkles,
  Sliders,
} from 'lucide-react';
import { useAppStore, SidebarTab } from '../../stores/appStore';

interface NavItem {
  id: SidebarTab;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'welcome', label: 'Welcome & Test', icon: PlayCircle },
  { id: 'voiceEngine', label: 'Voice & Whisper', icon: Mic, badge: 'On-Device' },
  { id: 'history', label: 'SuPaste Clipboard', icon: ClipboardList },
  { id: 'commandMode', label: 'Prompt Injection', icon: Sparkles },
  { id: 'preferences', label: 'Preferences', icon: Sliders },
];

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab } = useAppStore();

  return (
    <aside className="w-60 h-full flex flex-col justify-between bg-[#0a0a0c] border-r border-[#1e1e24] select-none p-3">
      {/* App Logo & Header */}
      <div>
        <div className="flex items-center gap-3 px-3 py-3 mb-2" data-tauri-drag-region>
          <div className="w-7 h-7 rounded-xl overflow-hidden shadow-sm border border-white/10 flex-none">
            <img src="/logo.png" alt="DopeNotch" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-xs font-semibold text-[#ededed] tracking-tight flex items-center gap-1.5">
              DopeNotch
              <span className="text-[9px] uppercase font-mono font-medium px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                TOP-NOTCH
              </span>
            </h1>
            <p className="text-[11px] text-zinc-400">Dictation & Clipboard</p>
          </div>
        </div>

        {/* Navigation Item List */}
        <nav className="space-y-1 overflow-y-auto max-h-[calc(100vh-140px)] pr-1">
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
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-white text-black font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-black' : 'text-zinc-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                      isActive
                        ? 'bg-black/10 text-black font-semibold'
                        : 'bg-[#18181c] text-zinc-400 border border-[#2a2a32]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer info */}
      <div className="px-3 py-2 border-t border-[#1e1e24] text-[11px] text-zinc-400 flex items-center justify-between">
        <span>DopeNotch v0.4.0</span>
        <span className="flex items-center gap-1.5 text-zinc-300 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          On-Device Ready
        </span>
      </div>
    </aside>
  );
};
