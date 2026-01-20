import { useState, useEffect } from "react";
import {
    Database,
    Server,
    HardDrive,
    Save,
    RotateCcw,
    CheckCircle2,
    AlertCircle,
    Wifi,
    WifiOff,
    ShieldAlert
} from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router";

type DbType = "postgres" | "mysql" | "sqlite";

interface DatabaseConfig {
    type: DbType;
    host?: string;
    port?: string;
    username?: string;
    password?: string;
    database?: string;
    isRemote: boolean;
}

export default function DatabaseSettings() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    // Default config
    const [config, setConfig] = useState<DatabaseConfig>({
        type: "sqlite",
        isRemote: false,
        host: "localhost",
        port: "5432",
        username: "postgres",
        database: "hanan_ventures",
        password: ""
    });

    useEffect(() => {
        // Load config from localStorage (simulating persistence)
        const storedConfig = localStorage.getItem("db_config");
        if (storedConfig) {
            try {
                setConfig(JSON.parse(storedConfig));
            } catch (e) {
                console.error("Failed to parse stored config", e);
            }
        }
    }, []);

    const handleSave = () => {
        setLoading(true);
        // Simulate save delay
        setTimeout(() => {
            localStorage.setItem("db_config", JSON.stringify(config));
            setLoading(false);
            // In a real implementation, this would trigger a backend reload/reconnection
            alert("Configuration saved. Application would restart to apply changes.");
        }, 1500);
    };

    const handleTestConnection = () => {
        setTesting(true);
        setTestResult(null);

        // Simulate connection test
        setTimeout(() => {
            setTesting(false);
            // Mock result based on basic validation
            if (config.isRemote && (!config.host || !config.username)) {
                setTestResult({ success: false, message: "Host and Username are required for remote connections." });
            } else {
                setTestResult({ success: true, message: "Connection successful! (Simulated)" });
            }
        }, 2000);
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
                            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">System Configuration</h1>
                            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Database Connection & Network Settings</p>
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
                                    Admin Zone
                                </CardTitle>
                                <CardDescription className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                                    Advanced Configuration
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-xs leading-relaxed text-slate-300">
                                    Changing these settings affects how this terminal connects to the central data store.
                                </p>
                                <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className={`w-2 h-2 rounded-full ${config.isRemote ? 'bg-blue-400' : 'bg-emerald-400'} animate-pulse`} />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Mode</span>
                                    </div>
                                    <p className="text-lg font-black uppercase tracking-tight text-white">
                                        {config.isRemote ? "Remote Network" : "Local Standalone"}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Alert className="bg-amber-50 border-amber-200 text-amber-900 rounded-2xl">
                            <AlertCircle className="h-4 w-4 text-amber-600" />
                            <AlertTitle className="text-xs font-black uppercase tracking-widest mb-1">Warning</AlertTitle>
                            <AlertDescription className="text-[10px] font-medium leading-relaxed opacity-90">
                                Incorrect database settings will prevent the application from loading sales or inventory data. Ensure you have the correct credentials from your network administrator.
                            </AlertDescription>
                        </Alert>
                    </div>

                    {/* Main Config Form */}
                    <div className="md:col-span-2 space-y-6">
                        <Card className="bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden">
                            <CardHeader className="border-b border-slate-100 pb-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-lg font-black text-slate-900 uppercase tracking-tight">Connection Settings</CardTitle>
                                        <CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                            Configure data persistence layer
                                        </CardDescription>
                                    </div>
                                    <Badge variant={config.isRemote ? "secondary" : "default"} className="uppercase tracking-widest font-black text-[9px] py-1 px-3">
                                        {config.isRemote ? <Wifi className="w-3 h-3 mr-1" /> : <HardDrive className="w-3 h-3 mr-1" />}
                                        {config.isRemote ? "Networked" : "On-Device"}
                                    </Badge>
                                </div>
                            </CardHeader>

                            <CardContent className="p-8 space-y-8">
                                {/* Mode Toggle */}
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="space-y-1">
                                        <Label htmlFor="remote-mode" className="text-sm font-black text-slate-900 uppercase tracking-tight">Centralized Database</Label>
                                        <p className="text-[10px] text-slate-500 font-medium max-w-[250px]">
                                            Connect to a remote server instead of using the local SQLite file.
                                        </p>
                                    </div>
                                    <Switch
                                        id="remote-mode"
                                        checked={config.isRemote}
                                        onCheckedChange={(checked) => setConfig(prev => ({ ...prev, isRemote: checked, type: checked ? 'postgres' : 'sqlite' }))}
                                    />
                                </div>

                                {config.isRemote ? (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        className="space-y-6"
                                    >
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Database Type</Label>
                                                <Select
                                                    value={config.type}
                                                    onValueChange={(val: DbType) => setConfig(prev => ({ ...prev, type: val }))}
                                                >
                                                    <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold text-sm">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="postgres">PostgreSQL</SelectItem>
                                                        <SelectItem value="mysql">MySQL / MariaDB</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Port</Label>
                                                <Input
                                                    value={config.port}
                                                    onChange={(e) => setConfig(prev => ({ ...prev, port: e.target.value }))}
                                                    placeholder="5432"
                                                    className="h-11 rounded-xl bg-slate-50 border-slate-200 font-mono text-sm"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Host / IP Address</Label>
                                            <div className="relative">
                                                <Server className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                                                <Input
                                                    value={config.host}
                                                    onChange={(e) => setConfig(prev => ({ ...prev, host: e.target.value }))}
                                                    placeholder="192.168.1.100"
                                                    className="pl-10 h-11 rounded-xl bg-slate-50 border-slate-200 font-mono text-sm"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Database Name</Label>
                                            <div className="relative">
                                                <Database className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                                                <Input
                                                    value={config.database}
                                                    onChange={(e) => setConfig(prev => ({ ...prev, database: e.target.value }))}
                                                    placeholder="hanan_ventures_db"
                                                    className="pl-10 h-11 rounded-xl bg-slate-50 border-slate-200 font-bold text-sm"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Username</Label>
                                                <Input
                                                    value={config.username}
                                                    onChange={(e) => setConfig(prev => ({ ...prev, username: e.target.value }))}
                                                    placeholder="admin"
                                                    className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold text-sm"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Password</Label>
                                                <Input
                                                    type="password"
                                                    value={config.password}
                                                    onChange={(e) => setConfig(prev => ({ ...prev, password: e.target.value }))}
                                                    placeholder="••••••••"
                                                    className="h-11 rounded-xl bg-slate-50 border-slate-200"
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center space-y-3"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                                            <HardDrive className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black text-slate-900 uppercase">Local Storage Active</h3>
                                            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                                                Application is reading from the embedded SQLite database at <code className="bg-slate-200 px-1 rounded">app_data/hanan.db</code>
                                            </p>
                                        </div>
                                    </motion.div>
                                )}

                                {testResult && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`p-4 rounded-xl border ${testResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'} flex items-start gap-3`}
                                    >
                                        {testResult.success ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <WifiOff className="w-5 h-5 shrink-0" />}
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wide">{testResult.success ? "Connection Verified" : "Connection Failed"}</p>
                                            <p className="text-xs mt-1 opacity-90">{testResult.message}</p>
                                        </div>
                                    </motion.div>
                                )}

                            </CardContent>
                            <CardFooter className="bg-slate-50 border-t border-slate-100 p-6 flex justify-between items-center">
                                <Button
                                    variant="ghost"
                                    onClick={handleTestConnection}
                                    disabled={!config.isRemote || testing}
                                    className="text-slate-500 hover:text-slate-900 font-bold uppercase tracking-widest text-[10px]"
                                >
                                    {testing ? "Pinging..." : "Test Connection"}
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-[10px] h-11 px-8 shadow-lg shadow-slate-200"
                                >
                                    {loading ? (
                                        <span className="flex items-center gap-2">Saving...</span>
                                    ) : (
                                        <span className="flex items-center gap-2"><Save className="w-4 h-4" /> Save Configuration</span>
                                    )}
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
