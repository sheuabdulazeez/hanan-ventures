import { TAdminSetting } from "@/types/database";
import { initDatabase } from ".";

type TAdminSettingByKey = {
  [key in TAdminSetting["key"]]: TAdminSetting["value"]
}
export async function getAdminSettings() {
  const db = await initDatabase();
  const settings = await db.select<TAdminSetting[]>('SELECT * FROM admin_settings');
  const settingsByKey = settings.reduce((acc, cur) => {
    acc[cur.key] = cur.value
    return acc
  }, {} as TAdminSettingByKey)
  return settingsByKey
}

export async function updateAdminSetting(settings: TAdminSettingByKey) {
  const db = await initDatabase();
  for (const key in settings) {
    const existing = await db.select<TAdminSetting[]>('SELECT * FROM admin_settings WHERE key = $1', [key]);
    if (existing.length > 0) {
      await db.execute('UPDATE admin_settings SET value = $1 WHERE key = $2', [settings[key], key]);
    } else {
      await db.execute('INSERT INTO admin_settings (key, value) VALUES ($1, $2)', [key, settings[key]]);
    }
  }
  return true;
}
