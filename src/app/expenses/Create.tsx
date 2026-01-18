import { useState } from "react";
import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    ArrowLeft,
    Save,
    Loader2,
    ShieldCheck,
    Receipt,
    FileText,
    DollarSign,
    Calendar as CalendarIcon,
    Tag,
    CreditCard,
    Building2
} from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { createExpense } from "@/database/expenses";
import { PaymentMethod } from "@/types/database";

const expenseSchema = z.object({
    description: z.string().min(2, "Description is required"),
    amount: z.coerce.number().min(1, "Amount must be greater than 0"),
    expense_type: z.string().min(2, "Category is required"),
    payment_method: z.string().min(1, "Payment method is required"),
    bank_name: z.string().optional(),
    expense_date: z.string().min(1, "Date is required"),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

export default function CreateExpense() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const { auth: { user } } = useAppStore();

    const form = useForm<ExpenseFormValues>({
        resolver: zodResolver(expenseSchema),
        defaultValues: {
            description: "",
            amount: 0,
            expense_type: "",
            payment_method: "cash",
            bank_name: "",
            expense_date: new Date().toISOString().split('T')[0],
        },
    });

    async function onSubmit(values: ExpenseFormValues) {
        if (!user) return;
        setIsLoading(true);
        try {
            await createExpense({
                expense_type: values.expense_type,
                description: values.description,
                amount: values.amount,
                payment_method: values.payment_method as PaymentMethod,
                bank_name: values.bank_name,
                expense_date: values.expense_date,
                employee_id: user.id,
            });
            toast.success("Expense Record Finalized", {
                description: "The expenditure has been logged and synchronized with central accounts."
            });
            navigate("/dashboard/expenses");
        } catch (error) {
            console.error(error);
            toast.error("Operation Failed", {
                description: "Could not synchronize expense record. Please verify system integrity."
            });
        } finally {
            setIsLoading(false);
        }
    }

    const expenseCategories = [
        "Logistics",
        "Procurement",
        "Utilities",
        "Rent/Facility",
        "Marketing",
        "Staff/Wages",
        "Maintenance",
        "Taxes/Fees",
        "Misc Operations"
    ];

    const paymentMethods = [
        { value: "cash", label: "Cash Reserves" },
        { value: "transfer", label: "Bank Transfer" },
        { value: "pos", label: "POS Terminal" }
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="min-h-screen bg-slate-50/50 pb-20"
        >
            {/* Header Section */}
            <div className="bg-white border-b border-slate-200 shadow-sm relative z-10">
                <div className="container mx-auto px-6 py-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex flex-col gap-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate("/dashboard/expenses")}
                                className="w-fit text-slate-400 hover:text-slate-900 -ml-2 px-2"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Ledger
                            </Button>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-200">
                                    <Receipt className="w-6 h-6" />
                                </div>
                                <div>
                                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Record Expense</h1>
                                    <p className="text-slate-500 font-medium tracking-tight mt-1">Authorize and document business expenditure</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="px-4 py-2 bg-slate-900/5 rounded-2xl border border-slate-900/10 flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-slate-900" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Fiscal Operations</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-6 py-12 max-w-4xl">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <Card className="border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden bg-white">
                            <CardHeader className="p-8 bg-slate-50/50 border-b border-slate-100">
                                <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-slate-900">Voucher Details</CardTitle>
                                <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Transaction core parameters</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 space-y-8">
                                {/* Description and Date */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <FormField
                                        control={form.control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem className="space-y-3">
                                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center">
                                                    <FileText className="w-3 h-3 mr-2" />
                                                    Expenditure Description
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="e.g. Monthly Electricity Settlement"
                                                        {...field}
                                                        className="h-12 bg-slate-50 border-slate-200 font-black text-slate-900 focus:bg-white focus:ring-slate-900 transition-all placeholder:text-slate-300 rounded-xl"
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-[10px] font-bold" />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="expense_date"
                                        render={({ field }) => (
                                            <FormItem className="space-y-3">
                                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center">
                                                    <CalendarIcon className="w-3 h-3 mr-2" />
                                                    Value Date
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="date"
                                                        {...field}
                                                        className="h-12 bg-slate-50 border-slate-200 font-black text-slate-900 focus:bg-white focus:ring-slate-900 transition-all rounded-xl"
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-[10px] font-bold" />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Amount and Category */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <FormField
                                        control={form.control}
                                        name="amount"
                                        render={({ field }) => (
                                            <FormItem className="space-y-3">
                                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center">
                                                    <DollarSign className="w-3 h-3 mr-2" />
                                                    Valuation (NGN)
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        placeholder="0.00"
                                                        {...field}
                                                        className="h-12 bg-slate-50 border-slate-200 font-black text-slate-900 focus:bg-white focus:ring-slate-900 transition-all rounded-xl text-lg"
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-[10px] font-bold" />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="expense_type"
                                        render={({ field }) => (
                                            <FormItem className="space-y-3">
                                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center">
                                                    <Tag className="w-3 h-3 mr-2" />
                                                    Categorization
                                                </FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-12 bg-slate-50 border-slate-200 font-black text-slate-900 focus:bg-white focus:ring-slate-900 transition-all rounded-xl">
                                                            <SelectValue placeholder="Select Category" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent className="bg-white border-slate-200">
                                                        {expenseCategories.map(cat => (
                                                            <SelectItem key={cat} value={cat} className="text-xs font-bold text-slate-700 focus:bg-slate-50">
                                                                {cat}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage className="text-[10px] font-bold" />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Payment Method and Bank */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <FormField
                                        control={form.control}
                                        name="payment_method"
                                        render={({ field }) => (
                                            <FormItem className="space-y-3">
                                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center">
                                                    <CreditCard className="w-3 h-3 mr-2" />
                                                    Payment Medium
                                                </FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-12 bg-slate-50 border-slate-200 font-black text-slate-900 focus:bg-white focus:ring-slate-900 transition-all rounded-xl">
                                                            <SelectValue placeholder="Method" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent className="bg-white border-slate-200">
                                                        {paymentMethods.map(method => (
                                                            <SelectItem key={method.value} value={method.value} className="text-xs font-bold text-slate-700 focus:bg-slate-50">
                                                                {method.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage className="text-[10px] font-bold" />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="bank_name"
                                        render={({ field }) => (
                                            <FormItem className="space-y-3">
                                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center">
                                                    <Building2 className="w-3 h-3 mr-2" />
                                                    Financial Institution (Optional)
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="e.g. Apex Bank PLS"
                                                        {...field}
                                                        className="h-12 bg-slate-50 border-slate-200 font-black text-slate-900 focus:bg-white focus:ring-slate-900 transition-all rounded-xl"
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-[10px] font-bold" />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex flex-col md:flex-row gap-6 items-center">
                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="w-full md:w-auto min-w-[240px] h-14 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-[0.2em] text-xs rounded-2xl shadow-xl shadow-slate-200 transition-all"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4 mr-2" />
                                )}
                                Authorize Expenditure
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => navigate("/dashboard/expenses")}
                                className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 h-14"
                            >
                                Discard Draft
                            </Button>
                            <div className="flex-1" />
                            <div className="flex items-center gap-3 px-6 py-4 bg-emerald-50 rounded-2xl border border-emerald-100/50">
                                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-900">Audit Compliance</p>
                                    <p className="text-[8px] font-bold text-emerald-600/70 uppercase">Transaction strictly documented</p>
                                </div>
                            </div>
                        </div>
                    </form>
                </Form>
            </div>
        </motion.div>
    );
}
