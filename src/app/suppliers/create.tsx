import { useState } from 'react';
import { useNavigate } from 'react-router';
import { createSupplier } from '@/database/suppliers';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Save,
  ShieldCheck,
  Truck
} from 'lucide-react';

export default function CreateSupplier() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    supplier_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createSupplier(formData);
      toast({
        title: "Supplier Registered",
        description: `${formData.supplier_name} has been added to the supply chain.`
      });
      navigate('/dashboard/suppliers');
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Registration Fault",
        description: "Failed to synchronize supplier data."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-slate-50/50 pb-12"
    >
      {/* Header Section */}
      <div className="bg-white border-b border-slate-200 mb-8">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard/suppliers')}
              className="text-slate-400 hover:text-slate-900 -ml-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Directory
            </Button>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-4xl font-black text-slate-900 mb-2">New Supplier</h1>
              <p className="text-slate-500 font-medium tracking-tight">Onboard a new partner to your supply network</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-2xl border border-slate-200">
              <Truck className="w-5 h-5 text-slate-400" />
              <span className="text-xs font-black uppercase tracking-widest text-slate-900">Chain Integration</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto">
          <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-900 shadow-sm">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900">Partner Profile</CardTitle>
                  <CardDescription className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Global synchronization parameters</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <Label htmlFor="supplier_name" className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <Building2 className="w-3 h-3" /> Supplier Entity Name
                    </Label>
                    <Input
                      id="supplier_name"
                      value={formData.supplier_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, supplier_name: e.target.value }))}
                      required
                      className="h-12 bg-slate-50 border-slate-200 font-black text-slate-900 focus:bg-white transition-colors"
                      placeholder="e.g. Acme Corp Industries"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_person" className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <User className="w-3 h-3" /> Liaison Officer
                    </Label>
                    <Input
                      id="contact_person"
                      value={formData.contact_person}
                      onChange={(e) => setFormData(prev => ({ ...prev, contact_person: e.target.value }))}
                      className="h-12 bg-slate-50 border-slate-200 font-bold text-slate-700"
                      placeholder="e.g. John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <Mail className="w-3 h-3" /> Communication Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="h-12 bg-slate-50 border-slate-200 font-bold text-slate-700"
                      placeholder="liason@supplier.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <Phone className="w-3 h-3" /> Secure Line
                    </Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="h-12 bg-slate-50 border-slate-200 font-bold text-slate-700"
                      placeholder="+234 ..."
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address" className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <MapPin className="w-3 h-3" /> Regional Headquarters
                    </Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      className="h-12 bg-slate-50 border-slate-200 font-bold text-slate-700"
                      placeholder="Full physical address"
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Verify Information Accuracy</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => navigate('/dashboard/suppliers')}
                      className="h-12 px-8 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-slate-900"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="h-12 px-8 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-slate-200"
                    >
                      {isSubmitting ? "Processing..." : "Register Supplier"}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}