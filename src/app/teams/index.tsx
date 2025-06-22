import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { toast } from "@/hooks/use-toast"
import { Button } from "@components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@components/ui/form"
import { Input } from "@components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@components/ui/table"
import { Switch } from "@components/ui/switch"
import { create, getUsers, update } from "@/database/user"
import { TUser, UserRole } from "@/types/database"
import { useAppStore } from "@/lib/store"

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

  const form = useForm<TeamMemberValues>({
    resolver: zodResolver(teamMemberSchema),
    defaultValues,
    resetOptions: { keepDefaultValues: true, keepValues: false }
  })

  async function onSubmit(data: TeamMemberValues) {
    setIsSubmitting(true)
    if (editingMember) {
      // // Update existing member
      await update(editingMember.id, data as Omit<TUser, "id" | "created_at" | "updated_at">)
      .then((e) => {
        getUsers().then(users => setTeamMembers(users))
        toast({
          title: "Team member updated",
          description: `${data.name}'s information has been updated.`,
        });
        setEditingMember(null);
      }).finally(() => {
        setIsSubmitting(false);
        form.reset();
      })
      
    } else {


      // Add new member
      const newTeamMember  = {  
        ...data,
        name: data.name!,
        username: data.username!,
        password: data.password!,
        role: data.role!,
      }

      await create(newTeamMember as Omit<TUser, "id" | "created_at" | "updated_at">)
      .then((e) => {
        console.log(e)
        getUsers().then(users => setTeamMembers(users))
        toast({
          title: "Team member added",
          description: `${data.name} has been added to the team.`,
        })
      }).catch(err => {
        setIsSubmitting(false);
        toast({
          title: "Error!",
          description: err.includes("UNIQUE") ? "Username already exists" : "Something went wrong",
          variant: "destructive"
        })
      }).finally(() => {
        setIsSubmitting(false);
        form.reset(defaultValues);
      })
    }
  }

  function handleEdit(member: TeamMember) {
    setEditingMember(member)
    form.reset({
      ...member,
      password: "",
    })
  }

  function handleToggleActive(id: string) {
    setTeamMembers(teamMembers.map((member) => (member.id === id ? { ...member, isActive: !member.isActive } : member)))
    const member = teamMembers.find((m) => m.id === id)
    if (member) {
      toast({
        title: `Team member ${member.isActive ? "deactivated" : "activated"}`,
        description: `${member.name} has been ${member.isActive ? "deactivated" : "activated"}.`,
      })
    }
  }

  useEffect(() => {
    getUsers().then(users => setTeamMembers(users))
  }, []);

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Team Members</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{editingMember ? "Edit Team Member" : "Add New Team Member"}</CardTitle>
            <CardDescription>
              {editingMember ? "Update team member information." : "Create a new team member account."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input {...field} autoCapitalize="off" autoComplete="off" autoCorrect="off"  />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} type="tel" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{editingMember ? "New Password (leave blank to keep current)" : "Password"}</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" required={!editingMember} value={field.value || ''}  />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={UserRole.admin}>Admin</SelectItem>
                          <SelectItem value={UserRole.manager}>Manager</SelectItem>
                          <SelectItem value={UserRole.cashier}>Cashier</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : editingMember ? "Update Team Member" : "Add Team Member"}
                </Button>
                {editingMember && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingMember(null)
                      form.reset(defaultValues)
                    }}
                  >
                    Cancel Edit
                  </Button>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Members List</CardTitle>
            <CardDescription>View and manage your team members.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>{member.name}</TableCell>
                    <TableCell>{member.username}</TableCell>
                    <TableCell>{member.phone}</TableCell>
                    <TableCell className="capitalize">{member.role}</TableCell>
                    <TableCell>
                      <Switch disabled={user?.id === member.id} checked={member.isActive} onCheckedChange={() => user?.id === member.id?null: handleToggleActive(member.id)} />
                    </TableCell>
                    <TableCell>
                      <Button disabled={user?.id === member.id} variant="outline" size="sm" onClick={() => user?.id === member.id ? null : handleEdit(member)}>
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

