import { useState } from 'react';
import { useNavigate } from 'react-router';
import { createSupplier } from '@/database/suppliers';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CreateSupplier() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    supplier_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createSupplier(formData);
      toast({
        title: "Success",
        description: "Supplier created successfully"
      });
      navigate('/dashboard/suppliers');
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create supplier"
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Add New Supplier</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Supplier Name</Label>
              <Input
                id="supplier_name"
                value={formData.supplier_name}
                onChange={(e) => setFormData(prev => ({ ...prev, supplier_name: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="contact_person">Contact Person</Label>
              <Input
                id="contact_person"
                value={formData.contact_person}
                onChange={(e) => setFormData(prev => ({ ...prev, contact_person: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/dashboard/suppliers')}
              >
                Cancel
              </Button>
              <Button type="submit">Create Supplier</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}