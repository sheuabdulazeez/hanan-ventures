import  { useEffect, useState } from 'react';
import { Switch } from '@components/ui/switch';
import { Label } from '@components/ui/label';
import { getAdminSettings, updateAdminSettings, initializeAdminSettings } from '@/database/settings';

export function TerminalModeToggle() {
  const [terminalMode, setTerminalMode] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      await initializeAdminSettings();
      const settings = await getAdminSettings();
      if (settings) {
        setTerminalMode(settings.terminalModeEnabled);
      }
    };
    loadSettings();
  }, []);

  const handleToggle = async (checked: boolean) => {
    setTerminalMode(checked);
    await updateAdminSettings({ id: 1, terminalModeEnabled: checked });
  };

  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="terminal-mode"
        checked={terminalMode}
        onCheckedChange={handleToggle}
      />
      <Label htmlFor="terminal-mode">Enable Terminal/Retail Mode</Label>
    </div>
  );
}