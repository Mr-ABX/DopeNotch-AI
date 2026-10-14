import React, { useState } from 'react';
import { Play, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';

export const CommandModeView: React.FC = () => {
  const { secondaryHotkey } = useAppStore();

  const [testCommand, setTestCommand] = useState('Open Cursor and mute volume');
  const [executedLog, setExecutedLog] = useState<string[]>([]);

  const SAMPLE_COMMANDS = [
    { voice: 'Open Cursor', action: 'Launch Cursor.app' },
    { voice: 'Lock computer', action: 'Lock Screen' },
    { voice: 'Set volume to 50%', action: 'Set Volume to 50%' },
    { voice: 'Empty trash', action: 'Empty Finder Trash' },
  ];

  const handleRunCommand = () => {
    if (!testCommand.trim()) return;

    setExecutedLog((prev) => [
      `[${new Date().toLocaleTimeString()}] Executed: "${testCommand}"`,
      ...prev,
    ]);
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 space-y-5 bg-[#000000] text-[#ededed]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[#ededed] tracking-tight">Command Mode</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Control apps and system actions using voice shortcuts</p>
        </div>

        <kbd className="px-2.5 py-1 rounded-md bg-[#18181c] text-zinc-300 font-mono text-xs border border-[#2a2a32]">
          {secondaryHotkey || '⌃⌥Space'}
        </kbd>
      </div>

      {/* Command Input & Execution Box */}
      <div className="p-4 rounded-xl bg-[#111114] border border-[#1e1e24] space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={testCommand}
            onChange={(e) => setTestCommand(e.target.value)}
            placeholder="Type or speak a voice command..."
            className="flex-1 bg-[#09090b] border border-[#1e1e24] rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700"
          />
          <button
            onClick={handleRunCommand}
            className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Play className="w-3 h-3 fill-current" /> Execute
          </button>
        </div>

        {/* Quick Example Chips */}
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          <span className="text-[11px] text-zinc-500 font-mono">Quick test:</span>
          {SAMPLE_COMMANDS.map((cmd, i) => (
            <button
              key={i}
              onClick={() => setTestCommand(cmd.voice)}
              className="text-[11px] px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
            >
              {cmd.voice}
            </button>
          ))}
        </div>

        {/* Execution Log */}
        {executedLog.length > 0 && (
          <div className="p-3 rounded-lg bg-[#09090b] border border-[#1e1e24] space-y-1 font-mono text-[11px]">
            {executedLog.map((log, i) => (
              <div key={i} className="text-zinc-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-amber-400 shrink-0" />
                <span>{log}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Spoken Commands Reference Table */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold text-zinc-400 tracking-wide uppercase">
          Supported Commands
        </h2>

        <div className="space-y-1.5">
          {SAMPLE_COMMANDS.map((cmd, i) => (
            <div
              key={i}
              className="p-3 rounded-lg bg-[#111114] border border-[#1e1e24] flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-white font-medium">"{cmd.voice}"</span>
                <span className="text-zinc-600">→</span>
                <span className="text-xs text-zinc-400">{cmd.action}</span>
              </div>
              <button
                onClick={() => setTestCommand(cmd.voice)}
                className="text-[11px] text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Use
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
