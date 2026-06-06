"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
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

const resetSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetForm = z.infer<typeof resetSchema>;

export function ResetPasswordPage() {
  const router = useRouter();
  const { user, loading, supabase } = useAuth();

  const form = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async (data: ResetForm) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: data.password });
      if (error) {
        toast.error(error.message);
        return;
      }
    } catch {
      toast.error("Couldn't update your password. Please try again.");
      return;
    }
    toast.success("Password updated");
    router.push("/members/dashboard");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center px-4">
        <p className="text-warm-gray">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center space-y-4">
          <h1 className="text-3xl font-serif font-bold text-optical-white tracking-tight">
            This reset link is invalid or has expired
          </h1>
          <p className="text-warm-gray">
            Request a new password reset link to continue.
          </p>
          <Link
            href="/members/forgot-password"
            className="inline-block text-brass-text hover:text-brass-muted transition-colors"
          >
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif font-bold text-optical-white tracking-tight">
            Set a new password
          </h1>
          <p className="text-warm-gray mt-2">
            Choose a new password for your account.
          </p>
        </div>

        <div className="bg-primary-foreground/5 border border-primary-foreground/10 backdrop-blur-sm rounded-sm p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-optical-white">
                      New password
                    </FormLabel>
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

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-optical-white">
                      Confirm password
                    </FormLabel>
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

              <Button
                type="submit"
                className="w-full bg-brass text-charcoal hover:bg-brass-muted"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "Updating..." : "Update password"}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
