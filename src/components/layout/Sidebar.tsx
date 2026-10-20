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
  PanelLeftClose,
  PanelLeft,
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
  const { activeTab, setActiveTab, isSidebarCollapsed, toggleSidebarCollapsed } = useAppStore();

  return (
    <aside
      className={`h-full flex flex-col justify-between bg-[#0a0a0c] border-r border-[#1e1e24] select-none transition-all duration-200 ${
        isSidebarCollapsed ? 'w-[70px] p-2.5' : 'w-[230px] p-3.5'
      }`}
    >
      <div>
        {/* App Branding Header + Collapse Toggle */}
        <div
          className={`flex items-center mb-4 ${
            isSidebarCollapsed ? 'flex-col gap-2 justify-center py-1' : 'justify-between px-2 py-1.5'
          }`}
          data-tauri-drag-region
        >
          <div className="flex items-center gap-2.5 min-w-0" data-tauri-drag-region>
            {/* Authentic macOS squircle app icon (rounded-[9px] continuous curve) */}
            <div className="w-7 h-7 rounded-[9px] overflow-hidden shadow-sm border border-white/15 bg-[#141418] flex-none">
              <img src="/logo.png" alt="DopeNotch" className="w-full h-full object-cover" />
            </div>
            {!isSidebarCollapsed && (
              <div data-tauri-drag-region className="min-w-0">
                <h1 className="text-[13px] font-semibold text-white tracking-tight leading-none truncate" data-tauri-drag-region>
                  DopeNotch
                </h1>
                <p className="text-[10.5px] text-zinc-500 mt-1 truncate" data-tauri-drag-region>
                  Voice & Clipboard
                </p>
              </div>
            )}
          </div>

          {/* Expand / Collapse Icon Button */}
          <button
            onClick={toggleSidebarCollapsed}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer shrink-0"
            title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isSidebarCollapsed ? (
              <PanelLeft className="w-3.5 h-3.5" />
            ) : (
              <PanelLeftClose className="w-3.5 h-3.5" />
            )}
          </button>
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
                title={isSidebarCollapsed ? item.label : undefined}
                className={`w-full flex items-center rounded-xl text-[12.5px] font-medium transition-all cursor-pointer ${
                  isSidebarCollapsed
                    ? 'justify-center p-2.5'
                    : 'gap-3 px-3 py-2'
                } ${
                  isActive
                    ? 'bg-white text-black font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-black' : 'text-zinc-400'
                  }`}
                />
                {!isSidebarCollapsed && (
                  <span className="truncate">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div
        className={`border-t border-[#1e1e24] text-[10.5px] text-zinc-500 flex items-center font-mono ${
          isSidebarCollapsed ? 'flex-col justify-center gap-1.5 py-2' : 'justify-between px-2.5 py-2'
        }`}
      >
        <span>v0.4.0</span>
        <span className="flex items-center gap-1.5 text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          {!isSidebarCollapsed && 'Offline'}
        </span>
      </div>
    </aside>
  );
};
