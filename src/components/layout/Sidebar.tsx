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
  FileEdit,
  Compass,
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
  { id: 'scratchpad', label: 'Scratchpad', icon: FileEdit },
  { id: 'copilot', label: 'Dopey Co-Pilot', icon: Compass },
  { id: 'history', label: 'Clipboard & History', icon: ClipboardList },
  { id: 'notes', label: 'Voice Notes', icon: FileText },
  { id: 'extensions', label: 'Extensions', icon: Blocks },
  { id: 'commandMode', label: 'Command Mode', icon: Terminal },
  { id: 'preferences', label: 'Preferences', icon: Sliders },
];

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    isSidebarCollapsed,
    toggleSidebarCollapsed,
    licenseInfo,
    setSettingsSection,
  } = useAppStore();

  const isMac =
    typeof navigator !== 'undefined' &&
    (/Mac|iPod|iPhone|iPad/.test(navigator.userAgent) ||
      (navigator as any).userAgentData?.platform === 'macOS' ||
      navigator.platform?.toUpperCase().indexOf('MAC') >= 0);

  const handleOpenLicense = () => {
    setActiveTab('preferences');
    setSettingsSection('license');
  };

  return (
    <aside
      className={`h-full flex flex-col justify-between bg-[#0a0a0c] border-r border-[#1e1e24] select-none transition-all duration-200 ${
        isSidebarCollapsed ? 'w-[64px] px-2 pb-2' : 'w-[220px] px-3.5 pb-3.5'
      } ${
        isMac ? 'pt-8' : 'pt-2.5'
      }`}
    >
      <div className="flex flex-col">
        {/* App Branding Header + Collapse Toggle */}
        <div
          className={`flex items-center mb-3 ${
            isSidebarCollapsed ? 'flex-col gap-2 justify-center py-1' : 'justify-between px-2 py-1'
          }`}
          data-tauri-drag-region
        >
          <div className="flex items-center gap-2.5 min-w-0" data-tauri-drag-region>
            {/* Authentic macOS squircle app icon */}
            <div className="w-7 h-7 rounded-[9px] overflow-hidden shadow-sm border border-white/15 bg-[#141418] flex-none">
              <img src="/logo.png" alt="DopeNotch" className="w-full h-full object-cover" />
            </div>
            {!isSidebarCollapsed && (
              <div data-tauri-drag-region className="min-w-0">
                <h1 className="text-[13px] font-semibold text-white tracking-tight leading-none truncate" data-tauri-drag-region>
                  DopeNotch
                </h1>
                <p className="text-[10px] text-zinc-500 mt-1 truncate" data-tauri-drag-region>
                  Voice & Spatial AI
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
              <div key={item.id} className="relative group">
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center rounded-xl text-[12px] font-medium transition-all cursor-pointer ${
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

                {/* Floating Hover Label when collapsed */}
                {isSidebarCollapsed && (
                  <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center z-[9999] pointer-events-none">
                    <div className="px-2.5 py-1 rounded-lg bg-[#18181c]/95 backdrop-blur-md border border-white/15 text-white text-[11px] font-medium shadow-[0_4px_16px_rgba(0,0,0,0.7)] whitespace-nowrap">
                      {item.label}
                    </div>
                  </div>
                )}
              </div>
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
        <span>v0.4.1</span>
        <button
          onClick={handleOpenLicense}
          className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase transition-all cursor-pointer ${
            licenseInfo?.is_pro
              ? licenseInfo.tier === 'forever'
                ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30 hover:bg-purple-500/25'
                : 'bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25'
              : 'bg-white/5 text-zinc-400 border border-white/10 hover:text-white hover:bg-white/10'
          }`}
          title="Click to view license & edition status"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              licenseInfo?.is_pro
                ? licenseInfo.tier === 'forever'
                  ? 'bg-purple-400'
                  : 'bg-amber-400'
                : 'bg-emerald-400'
            }`}
          />
          {!isSidebarCollapsed && (
            <span>
              {licenseInfo?.is_pro
                ? licenseInfo.tier === 'forever'
                  ? 'PRO FOREVER'
                  : 'PRO CORE'
                : 'COMMUNITY'}
            </span>
          )}
        </button>
      </div>
    </aside>
  );
};
