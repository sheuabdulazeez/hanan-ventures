import { useState, useEffect } from "react";
import { getPendingReceipts, approveReceipt, PurchaseReceipt, PurchaseReceiptItem } from "@/database/orders";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useAppStore } from "@/lib/store";
import { Loader2, CheckCircle2, ClipboardCheck } from "lucide-react";

// Extended type for display
interface ExtendedReceipt extends PurchaseReceipt {
    po_ref: string;
    supplier_name: string;
    receiver_name: string;
    items: (PurchaseReceiptItem & { product_name: string, unit_name: string })[];
}

export default function Approvals({ onUpdate }: { onUpdate?: () => void }) {
    const { auth: { user } } = useAppStore();
    const [loading, setLoading] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [receipts, setReceipts] = useState<ExtendedReceipt[]>([]);

    useEffect(() => {
        loadReceipts();
    }, []);

    const loadReceipts = async () => {
        setLoading(true);
        try {
            const data = await getPendingReceipts();
            setReceipts(data as unknown as ExtendedReceipt[]);
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to load pending approvals.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: string) => {
        setProcessingId(id);
        try {
            if (!user) throw new Error("You must be logged in to approve.");
            await approveReceipt(id, user.id);
            toast({ title: "Approved", description: "Inventory has been updated." });
            loadReceipts();
            if (onUpdate) onUpdate();
        } catch (e) {
            console.error(e);
            toast({ title: "Failed", description: e instanceof Error ? e.message : "Could not approve receipt.", variant: "destructive" });
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Pending Approvals</h2>
                    <p className="text-sm text-slate-500">Review stock received by staff before updating inventory.</p>
                </div>
                <Button variant="outline" size="sm" onClick={loadReceipts} disabled={loading}>
                    Refresh
                </Button>
            </div>

            {receipts.length === 0 && !loading && (
                <Card className="bg-slate-50 border-dashed border-2 border-slate-200">
                    <CardContent className="h-40 flex flex-col items-center justify-center text-slate-400">
                        <ClipboardCheck className="w-8 h-8 mb-2 opacity-50" />
                        <p className="font-medium text-sm">No pending approvals found.</p>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 gap-4">
                {receipts.map(receipt => (
                    <Card key={receipt.id} className="bg-white border-slate-200 overflow-hidden">
                        <div className="p-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">
                                            PO #{receipt.po_ref.substring(0, 8)}
                                        </span>
                                        <span className="text-xs text-slate-400 font-medium">
                                            • {new Date(receipt.received_date).toLocaleString()}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-slate-900 text-lg">{receipt.supplier_name}</h3>
                                    <p className="text-sm text-slate-600">
                                        Received by <span className="font-bold text-slate-800">{receipt.receiver_name}</span>
                                    </p>
                                </div>

                                <Button
                                    onClick={() => handleApprove(receipt.id)}
                                    disabled={!!processingId}
                                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase tracking-widest text-[10px] h-11 px-6 shadow-md shadow-slate-200"
                                >
                                    {processingId === receipt.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    ) : (
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                    )}
                                    Approve & Update Stock
                                </Button>
                            </div>

                            <div className="bg-slate-50/50 rounded-xl border border-slate-100 p-4">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Items Received</h4>
                                <div className="space-y-2">
                                    {receipt.items?.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-sm border-b border-dashed border-slate-200 last:border-0 pb-2 last:pb-0">
                                            <span className="font-medium text-slate-700">{item.product_name}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-900">{item.quantity_received}</span>
                                                <span className="text-xs text-slate-500 uppercase">{item.unit_name || 'Units'}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
