import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "../hooks/use-toast";
import { login } from "@/database/user";
import { useAppStore } from "@/lib/store";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Eye, EyeOff, ShoppingCart } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

export default function AuthForm() {
  const { setUser, businessInfo } = useAppStore();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // TODO: Implement check for authentication token and redirect to dashboard

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsVerifying(true);
    await login(username, password)
      .then((res) => {
        if (!res || "error" in res) {
          toast({
            title: "Invalid username or password",
            variant: "destructive",
          });
          setIsVerifying(false);
          return;
        }
        setUser(res);
        toast({ title: "Login successful", variant: "default" });
      })
      .catch((err) => {
        toast({
          variant: "destructive",
          title: "Error",
          description: err.message,
        });
        setIsVerifying(false);
      });
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center space-x-2 mb-4">
          {!businessInfo.logo ? (
            <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
              <ShoppingCart className="h-6 w-6 text-accent-foreground" />
            </div>
          ) : null}

          <h1 className="text-2xl font-bold text-foreground">
            {businessInfo.name || "Retail POS"}
          </h1>
        </div>
        <CardTitle className="text-xl">Welcome Back</CardTitle>
        <CardDescription>Sign in to your account to continue</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-accent hover:bg-accent/90"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground mb-2">Info:</p>
          <div className="space-y-1 text-xs">
            Contact admin if you don't know your login details.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
