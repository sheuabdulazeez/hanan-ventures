import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { getPurchaseOrders, createPurchaseReceipt, PurchaseOrder } from "@/database/orders";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, PackageCheck, Truck } from "lucide-react";
import { getPurchaseOrderById } from "@/database/orders";

export default function ReceivePO({ onUpdate }: { onUpdate?: () => void }) {
    const { auth: { user } } = useAppStore();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [pendingPOs, setPendingPOs] = useState<PurchaseOrder[]>([]);
    const [selectedPOId, setSelectedPOId] = useState<string>("");
    const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
    const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({});

    useEffect(() => {
        loadPendingPOs();
    }, []);

    useEffect(() => {
        if (selectedPOId) {
            loadPODetails(selectedPOId);
        } else {
            setSelectedPO(null);
            setReceivedQuantities({});
        }
    }, [selectedPOId]);

    const loadPendingPOs = async () => {
        setLoading(true);
        try {
            const pos = await getPurchaseOrders(['pending', 'partially_received']);
            setPendingPOs(pos);
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to load pending orders.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const loadPODetails = async (id: string) => {
        setLoading(true);
        try {
            const fullPO = await getPurchaseOrderById(id);
            setSelectedPO(fullPO);
            // Initialize receive quantities to remaining amounts
            const initialQtys: Record<string, number> = {};
            fullPO?.items?.forEach(item => {
                const receivedInUnit = (item.quantity_received_base || 0) / (item.conversion_to_base || 1);
                const remaining = Math.max(0, item.quantity_ordered - receivedInUnit);
                initialQtys[item.product_id] = remaining;
            });
            setReceivedQuantities(initialQtys);
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to load order details.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const getRemaining = (item: NonNullable<PurchaseOrder["items"]>[number]) => {
        const receivedInUnit = (item.quantity_received_base || 0) / (item.conversion_to_base || 1);
        return Math.max(0, item.quantity_ordered - receivedInUnit);
    };

    const handleQuantityChange = (productId: string, qty: string) => {
        let val = parseInt(qty) || 0;
        const item = selectedPO?.items?.find(i => i.product_id === productId);
        if (item) {
            const remaining = getRemaining(item);
            if (val > remaining) {
                toast({
                    title: "Exceeds remaining quantity",
                    description: `Only ${remaining} of ${item.product_name} is still outstanding on this order.`,
                    variant: "destructive",
                });
                val = remaining;
            }
        }
        setReceivedQuantities(prev => ({
            ...prev,
            [productId]: val
        }));
    };

    const handleSubmit = async () => {
        if (!selectedPO || !user) return;

        for (const item of selectedPO.items || []) {
            const qty = receivedQuantities[item.product_id] || 0;
            if (qty > getRemaining(item)) {
                toast({
                    title: "Cannot submit",
                    description: `Received quantity for ${item.product_name} exceeds what's still outstanding.`,
                    variant: "destructive",
                });
                return;
            }
        }

        setSubmitting(true);
        try {
            const itemsToReceive = Object.entries(receivedQuantities).map(([pid, qty]) => {
                const originalItem = selectedPO.items?.find(i => i.product_id === pid);
                return {
                    productId: pid,
                    quantityReceived: qty,
                    unitId: originalItem?.unit_id
                };
            });

            await createPurchaseReceipt(selectedPO.id, user.id, itemsToReceive);

            toast({ title: "Success", description: "Items received successfully. Waiting for Admin approval." });
            setSelectedPOId("");
            loadPendingPOs();
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error(error);
            toast({ title: "Submission Failed", description: "Could not submit receipt.", variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <Card className="bg-white border-slate-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Truck className="w-5 h-5 text-slate-500" />
                        Receive Purchase Order
                    </CardTitle>
                    <CardDescription>Select a pending order to record received inventory.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Select Order</label>
                        <Select value={selectedPOId} onValueChange={setSelectedPOId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Begin by selecting a Purchase Order..." />
                            </SelectTrigger>
                            <SelectContent>
                                {pendingPOs.map(po => (
                                    <SelectItem key={po.id} value={po.id}>
                                        #{po.id.slice(-8).toUpperCase()} - {po.supplier_name} - {new Date(po.order_date).toLocaleDateString()}
                                    </SelectItem>
                                ))}
                                {pendingPOs.length === 0 && <div className="p-2 text-sm text-slate-500 text-center">No pending orders found.</div>}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedPO && (
                        <div className="mt-8 border border-slate-100 rounded-xl overflow-hidden">
                            <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-slate-900">{selectedPO.supplier_name}</h3>
                                    <p className="text-xs text-slate-500">Ordered on {new Date(selectedPO.order_date).toLocaleDateString()}</p>
                                </div>
                                <Badge variant="outline" className="uppercase bg-white">
                                    {selectedPO.status.replace('_', ' ')}
                                </Badge>
                            </div>
                            <div className="p-0">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-white border-b border-slate-100 text-xs uppercase text-slate-500 font-bold">
                                        <tr>
                                            <th className="px-4 py-3">Product</th>
                                            <th className="px-4 py-3 text-center">Ordered</th>
                                            <th className="px-4 py-3 text-center">Received</th>
                                            <th className="px-4 py-3 text-center">Remaining</th>
                                            <th className="px-4 py-3 w-32">Receive Now</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {selectedPO.items?.map(item => {
                                            const receivedInUnit = (item.quantity_received_base || 0) / (item.conversion_to_base || 1);
                                            const remaining = getRemaining(item);

                                            // Format received to remove decimal if clean integer
                                            const receivedDisplay = Number.isInteger(receivedInUnit) ? receivedInUnit : receivedInUnit.toFixed(2);
                                            const remainingDisplay = Number.isInteger(remaining) ? remaining : remaining.toFixed(2);

                                            return (
                                                <tr key={item.id} className="hover:bg-slate-50/50">
                                                    <td className="px-4 py-3">
                                                        <div className="font-bold text-slate-700">{item.product_name}</div>
                                                        {item.unit_name && <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{item.unit_name}</div>}
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-slate-500 font-bold">{item.quantity_ordered}</td>
                                                    <td className="px-4 py-3 text-center text-amber-600 font-bold">{receivedDisplay}</td>
                                                    <td className="px-4 py-3 text-center text-slate-900 font-black">{remainingDisplay}</td>
                                                    <td className="px-4 py-2">
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            max={remaining}
                                                            className="h-9 text-center font-bold"
                                                            value={receivedQuantities[item.product_id] || 0}
                                                            onChange={(e) => handleQuantityChange(item.product_id, e.target.value)}
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </CardContent>
                {selectedPO && (
                    <CardFooter className="bg-slate-50/50 border-t border-slate-100 justify-end p-4">
                        <Button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase tracking-widest text-xs h-10 px-6"
                        >
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <PackageCheck className="w-4 h-4 mr-2" />}
                            Confirm Receipt
                        </Button>
                    </CardFooter>
                )}
            </Card>
        </div>
    );
}
