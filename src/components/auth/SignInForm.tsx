"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

interface SignInFormProps {
  /**
   * Called after a successful sign-in. When omitted, the form navigates to
   * the member dashboard (the default for /members/login). The combined
   * /join page relies on the same default.
   */
  onSuccess?: () => void;
}

export function SignInForm({ onSuccess }: SignInFormProps) {
  const { signIn } = useAuth();
  const router = useRouter();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginForm) => {
    const { error } = await signIn(data.email, data.password);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (onSuccess) {
      onSuccess();
      return;
    }
    router.push("/members/dashboard");
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-optical-white">Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    className="bg-charcoal/50 border-primary-foreground/20 text-optical-white placeholder:text-warm-gray"
                    {...field}
                  />
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
                <FormLabel className="text-optical-white">Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    className="bg-charcoal/50 border-primary-foreground/20 text-optical-white placeholder:text-warm-gray"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="text-right -mt-2">
            <Link
              href="/members/forgot-password"
              className="text-sm text-brass-text hover:text-brass-muted transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            className="w-full bg-brass text-charcoal hover:bg-brass-muted"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </Form>

      <p className="text-center text-warm-gray text-sm mt-6">
        Don&apos;t have an account?{" "}
        <Link
          href="/members/signup"
          className="text-brass-text hover:text-brass-muted transition-colors"
        >
          Create an account
        </Link>
      </p>
    </>
  );
}
