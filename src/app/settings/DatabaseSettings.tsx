import { useEffect, useState } from "react";
import {
    Database,
    HardDrive,
    Download,
    CheckCircle2,
    AlertCircle,
    ShieldAlert
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/lib/store";
import { useNavigate } from "react-router";
import { toast } from "@/hooks/use-toast";
import { RotateCcw } from "lucide-react";

interface DatabaseInfo {
    path: string;
    size_bytes: number;
}

interface BackupFile {
    name: string;
    size_bytes: number;
    modified_secs: number;
}

interface BackupInfo {
    dir: string;
    is_default_dir: boolean;
    keep: number;
    files: BackupFile[];
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function DatabaseSettings() {
    const navigate = useNavigate();
    const [dbInfo, setDbInfo] = useState<DatabaseInfo | null>(null);
    const [loadError, setLoadError] = useState("");
    const [backingUp, setBackingUp] = useState(false);
    const [lastBackupPath, setLastBackupPath] = useState<string | null>(null);
    const { auth: { user } } = useAppStore();
    const isSuperAdmin = user?.role === "super_admin";
    const [backupInfo, setBackupInfo] = useState<BackupInfo | null>(null);
    const [backupDirInput, setBackupDirInput] = useState("");
    const [savingDir, setSavingDir] = useState(false);

    const loadBackupInfo = () =>
        invoke<BackupInfo>("get_backup_info")
            .then((info) => {
                setBackupInfo(info);
                setBackupDirInput(info.is_default_dir ? "" : info.dir);
            })
            .catch(() => setBackupInfo(null));

    useEffect(() => {
        invoke<DatabaseInfo>("get_database_info")
            .then(setDbInfo)
            .catch((err) => setLoadError(String(err)));
        loadBackupInfo();
    }, []);

    const handleSaveBackupDir = async () => {
        setSavingDir(true);
        try {
            await invoke("set_backup_dir", { path: backupDirInput });
            toast({ title: "Backup folder saved" });
            await loadBackupInfo();
        } catch (err: any) {
            toast({ variant: "destructive", title: "Could not use that folder", description: String(err?.message || err) });
        } finally {
            setSavingDir(false);
        }
    };

    const handleBackup = async () => {
        setBackingUp(true);
        setLastBackupPath(null);
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
            const filename = `hanan-ventures-backup-${timestamp}.db`;
            const path = await invoke<string>("backup_database", { filename });
            setLastBackupPath(path);
            toast({ title: "Backup created", description: path });
        } catch (err: any) {
            toast({
                variant: "destructive",
                title: "Backup failed",
                description: String(err?.message || err),
            });
        } finally {
            setBackingUp(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-slate-200">
                <div className="container mx-auto px-6 py-8">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => navigate("/dashboard")}
                            className="rounded-xl h-10 w-10"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Database</h1>
                            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Storage location & backups</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-6 py-8 max-w-4xl">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                    {/* Sidebar / Info */}
                    <div className="md:col-span-1 space-y-6">
                        <Card className="bg-slate-900 border-slate-800 text-white rounded-3xl overflow-hidden shadow-xl">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-3 text-sm font-black uppercase tracking-widest">
                                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                                    Storage
                                </CardTitle>
                                <CardDescription className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                                    Where your data actually lives
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-xs leading-relaxed text-slate-300">
                                    This app stores all data in a single local SQLite file on this
                                    device. There is no remote/networked database — each installed
                                    copy of the app has its own independent data.
                                </p>
                                <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mode</span>
                                    </div>
                                    <p className="text-lg font-black uppercase tracking-tight text-white">
                                        Local Standalone
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Alert className="bg-amber-50 border-amber-200 text-amber-900 rounded-2xl">
                            <AlertCircle className="h-4 w-4 text-amber-600" />
                            <AlertTitle className="text-xs font-black uppercase tracking-widest mb-1">Back up regularly</AlertTitle>
                            <AlertDescription className="text-[10px] font-medium leading-relaxed opacity-90">
                                A backup is made automatically once a day and the last {backupInfo?.keep ?? 14} are kept.
                                Those copies live on this same device, so also copy one to an external
                                drive or cloud storage now and then: if the device is lost, so is everything on it.
                            </AlertDescription>
                        </Alert>
                    </div>

                    {/* Main panel */}
                    <div className="md:col-span-2 space-y-6">
                        <Card className="bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden">
                            <CardHeader className="border-b border-slate-100 pb-6">
                                <CardTitle className="text-lg font-black text-slate-900 uppercase tracking-tight">Database File</CardTitle>
                                <CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                    Local SQLite database
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="p-8 space-y-6">
                                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center space-y-3">
                                    <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                                        <HardDrive className="w-6 h-6" />
                                    </div>
                                    {loadError ? (
                                        <p className="text-xs text-red-600">{loadError}</p>
                                    ) : dbInfo ? (
                                        <div>
                                            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto break-all">
                                                <code className="bg-slate-200 px-1 rounded">{dbInfo.path}</code>
                                            </p>
                                            <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-widest font-bold">
                                                {formatBytes(dbInfo.size_bytes)}
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-400">Loading...</p>
                                    )}
                                </div>

                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="space-y-1">
                                        <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Back up now</p>
                                        <p className="text-[10px] text-slate-500 font-medium max-w-[320px]">
                                            Copies the current database to your Downloads folder. Move
                                            the file somewhere safe (external drive, cloud storage) afterwards.
                                        </p>
                                    </div>
                                    <Database className="w-5 h-5 text-slate-300 shrink-0" />
                                </div>

                                {lastBackupPath && (
                                    <div className="p-4 rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-800 flex items-start gap-3">
                                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wide">Backup Created</p>
                                            <p className="text-xs mt-1 opacity-90 break-all">{lastBackupPath}</p>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="bg-slate-50 border-t border-slate-100 p-6 flex justify-end">
                                <Button
                                    onClick={handleBackup}
                                    disabled={backingUp}
                                    className="bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-[10px] h-11 px-8 shadow-lg shadow-slate-200"
                                >
                                    {backingUp ? (
                                        <span className="flex items-center gap-2">Backing up...</span>
                                    ) : (
                                        <span className="flex items-center gap-2"><Download className="w-4 h-4" /> Back Up Database</span>
                                    )}
                                </Button>
                            </CardFooter>
                        </Card>
                        <Card className="bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden">
                            <CardHeader className="border-b border-slate-100 pb-6">
                                <CardTitle className="text-lg font-black text-slate-900 uppercase tracking-tight">Automatic Backups</CardTitle>
                                <CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                    Once a day, last {backupInfo?.keep ?? 14} kept
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 space-y-5">
                                {backupInfo ? (
                                    <>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Saved in</p>
                                            <code className="bg-slate-100 px-2 py-1 rounded text-xs break-all">{backupInfo.dir}</code>
                                        </div>

                                        {isSuperAdmin && (
                                            <div className="space-y-2">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Change folder (full path, e.g. an external drive)</p>
                                                <div className="flex gap-2">
                                                    <Input
                                                        value={backupDirInput}
                                                        onChange={(e) => setBackupDirInput(e.target.value)}
                                                        placeholder="Leave empty for the default folder"
                                                        className="text-xs"
                                                    />
                                                    <Button onClick={handleSaveBackupDir} disabled={savingDir} variant="outline" className="text-[10px] font-black uppercase tracking-widest">
                                                        {savingDir ? "Saving..." : "Save"}
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                                {backupInfo.files.length === 0 ? "No backups yet" : `Latest: ${new Date(backupInfo.files[0].modified_secs * 1000).toLocaleString()}`}
                                            </p>
                                            <div className="rounded-xl border border-slate-100 divide-y divide-slate-100 max-h-48 overflow-auto">
                                                {backupInfo.files.slice(0, 20).map((f) => (
                                                    <div key={f.name} className="flex justify-between gap-3 px-3 py-2 text-xs">
                                                        <span className="truncate text-slate-700">{f.name}</span>
                                                        <span className="shrink-0 text-slate-400">{formatBytes(f.size_bytes)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-xs text-slate-400">Loading...</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
