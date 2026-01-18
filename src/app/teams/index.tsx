import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { create, getUsers, update } from "@/database/user"
import { TUser, UserRole } from "@/types/database"
import { useAppStore } from "@/lib/store"
import { motion, AnimatePresence } from "framer-motion"
import {
  Users,
  UserPlus,
  UserCog,
  Shield,
  Phone,
  User,
  Lock,
  CheckCircle2,
  XCircle,
  Search,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Contact2
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

const teamMemberSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  username: z.string().min(3, {
    message: "Username must be at least 3 characters.",
  }),
  phone: z.string().min(10, {
    message: "Phone number must be at least 10 characters.",
  }),
  password: z
    .string()
    .optional(),
  role: z.nativeEnum(UserRole, {
    required_error: "Please select a role.",
  }).default(UserRole.cashier),
  isActive: z.boolean().default(true),
})

type TeamMemberValues = z.infer<typeof teamMemberSchema>

interface TeamMember extends Omit<TeamMemberValues, "password"> {
  id: string
}

const defaultValues: Partial<TeamMemberValues> = {
  role: UserRole.cashier,
  isActive: true,
  name: "",
  username: "",
  phone: "",
  password: "",
}

export default function TeamMembersPage() {
  const { auth: { user } } = useAppStore()
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  const form = useForm<TeamMemberValues>({
    resolver: zodResolver(teamMemberSchema),
    defaultValues,
    resetOptions: { keepDefaultValues: true, keepValues: false }
  })

  async function onSubmit(data: TeamMemberValues) {
    setIsSubmitting(true)
    try {
      if (editingMember) {
        await update(editingMember.id, data as Omit<TUser, "id" | "created_at" | "updated_at">)
        const users = await getUsers()
        setTeamMembers(users)
        toast({
          title: "Team updated",
          description: "Staff profile has been synchronized successfully.",
        })
        setEditingMember(null)
      } else {
        await create(data as Omit<TUser, "id" | "created_at" | "updated_at">)
        const users = await getUsers()
        setTeamMembers(users)
        toast({
          title: "Identity created",
          description: `${data.name} is now a part of the workforce.`,
        })
      }
      form.reset(defaultValues)
    } catch (err: any) {
      toast({
        title: "Registration Fault",
        description: err.includes("UNIQUE") ? "Identity already exists in system." : "Process synchronization failed.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleEdit(member: TeamMember) {
    setEditingMember(member)
    form.reset({
      ...member,
      password: "",
    })
  }

  const filteredMembers = teamMembers.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.role.toLowerCase().includes(searchTerm.toLowerCase())
  )

  useEffect(() => {
    getUsers().then(users => setTeamMembers(users))
  }, [])

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return <Badge className="bg-slate-900 text-white border-none text-[8px] font-black uppercase tracking-widest gap-1"><ShieldCheck className="w-2.5 h-2.5" /> High Priv</Badge>
      case 'manager': return <Badge className="bg-blue-50 text-blue-600 border-blue-100/50 text-[8px] font-black uppercase tracking-widest gap-1"><ShieldAlert className="w-2.5 h-2.5" /> Mid Priv</Badge>
      default: return <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-[8px] font-black uppercase tracking-widest gap-1"><Contact2 className="w-2.5 h-2.5" /> Standard</Badge>
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-slate-50/50"
    >
      {/* Header Section */}
      <div className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-4xl font-black text-slate-900 mb-2">Team Directory</h1>
              <p className="text-slate-500 font-medium tracking-tight">Identity and access control for your workforce</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-2xl border border-slate-200">
              <Users className="w-5 h-5 text-slate-400" />
              <span className="text-xs font-black uppercase tracking-widest text-slate-900">{teamMembers.length} Active Profiles</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Identity Creation Form */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="bg-white border-slate-200 shadow-sm overflow-hidden sticky top-8">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-900 shadow-sm">
                    {editingMember ? <UserCog className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                  </div>
                  <div>
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900">
                      {editingMember ? "Modify Profile" : "New Enrollment"}
                    </CardTitle>
                    <CardDescription className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">
                      Configure permissions and credentials
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><User className="w-3 h-3" /> Full Name</FormLabel>
                          <FormControl>
                            <Input {...field} className="h-11 bg-slate-50 border-slate-200 font-bold text-slate-700 focus:bg-white transition-colors" />
                          </FormControl>
                          <FormMessage className="text-[10px] font-bold" />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Lock className="w-3 h-3" /> Handle</FormLabel>
                            <FormControl>
                              <Input {...field} autoCapitalize="off" autoComplete="off" className="h-11 bg-slate-50 border-slate-200 font-black text-slate-900 text-xs focus:bg-white transition-colors" />
                            </FormControl>
                            <FormMessage className="text-[10px] font-bold" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Phone className="w-3 h-3" /> Mobile</FormLabel>
                            <FormControl>
                              <Input {...field} type="tel" className="h-11 bg-slate-50 border-slate-200 font-bold text-slate-700 text-xs focus:bg-white transition-colors" />
                            </FormControl>
                            <FormMessage className="text-[10px] font-bold" />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Shield className="w-3 h-3" /> Authorization Pass</FormLabel>
                          <FormControl>
                            <Input {...field} type="password" required={!editingMember} value={field.value || ''} className="h-11 bg-slate-50 border-slate-200 font-bold text-slate-700 focus:bg-white transition-colors" />
                          </FormControl>
                          <FormMessage className="text-[10px] font-bold" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><ShieldCheck className="w-3 h-3" /> Privilege Tier</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-11 bg-slate-50 border-slate-200 font-black text-slate-900 text-xs uppercase tracking-widest">
                                <SelectValue placeholder="Select a role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-white">
                              <SelectItem value={UserRole.admin} className="text-xs font-black uppercase tracking-widest">Admin</SelectItem>
                              <SelectItem value={UserRole.manager} className="text-xs font-black uppercase tracking-widest">Manager</SelectItem>
                              <SelectItem value={UserRole.cashier} className="text-xs font-black uppercase tracking-widest">Cashier</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-[10px] font-bold" />
                        </FormItem>
                      )}
                    />
                    <div className="pt-4 flex flex-col gap-2">
                      <Button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 hover:bg-slate-800 text-white h-11 font-black uppercase tracking-widest text-[10px]">
                        {isSubmitting ? "Syncing..." : editingMember ? "Update Identity" : "Enroll Member"}
                      </Button>
                      {editingMember && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full text-slate-400 font-bold uppercase tracking-widest text-[9px] h-9"
                          onClick={() => {
                            setEditingMember(null)
                            form.reset(defaultValues)
                          }}
                        >
                          Discard Changes
                        </Button>
                      )}
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          {/* Identity Management List */}
          <div className="lg:col-span-8 space-y-6">
            <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search identities or roles..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-11 bg-white border-slate-200 focus:ring-slate-900 focus:border-slate-900 text-sm font-medium shadow-none"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-slate-100">
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-12 px-6">Staff Profile</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-12">Tier</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-12">Security</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-12 text-right px-6">Modify</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence mode="popLayout">
                      {filteredMembers.map((member, index) => (
                        <motion.tr
                          key={member.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="group hover:bg-slate-50/50 border-slate-50 transition-colors"
                        >
                          <TableCell className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 transition-transform group-hover:scale-110">
                                <User className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-black text-slate-900 text-sm leading-tight">{member.name}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">@{member.username} • {member.phone}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            {getRoleBadge(member.role)}
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex items-center gap-3">
                              <Switch
                                disabled={user?.id === member.id}
                                checked={member.isActive}
                                onCheckedChange={() => user?.id === member.id ? null : handleToggleActive(member.id)}
                                className="data-[state=checked]:bg-slate-900"
                              />
                              <span className={`text-[9px] font-black uppercase tracking-widest ${member.isActive ? 'text-emerald-500' : 'text-slate-300'}`}>
                                {member.isActive ? "Authorized" : "Revoked"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right px-6 py-4">
                            <Button
                              disabled={user?.id === member.id}
                              variant="ghost"
                              size="sm"
                              onClick={() => user?.id === member.id ? null : handleEdit(member)}
                              className="h-8 w-8 p-0 text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                    {filteredMembers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="h-64 text-center">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <Users className="w-12 h-12 text-slate-100" />
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">No identities found in system</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
