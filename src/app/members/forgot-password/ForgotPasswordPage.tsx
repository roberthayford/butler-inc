"use client";

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

const forgotSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

type ForgotForm = z.infer<typeof forgotSchema>;

export function ForgotPasswordPage() {
  const router = useRouter();

  const form = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotForm) => {
    const response = await fetch("/api/members/password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.email }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        toast.error("Too many requests. Please try again later.");
      } else {
        toast.error("Couldn't send the reset email. Please try again.");
      }
      return;
    }

    router.push(
      `/members/forgot-password/check-email?email=${encodeURIComponent(data.email)}`,
    );
  };

  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif font-bold text-optical-white tracking-tight">
            Reset your password
          </h1>
          <p className="text-warm-gray mt-2">
            Enter your email and we&rsquo;ll send you a reset link.
          </p>
        </div>

        <div className="bg-primary-foreground/5 border border-primary-foreground/10 backdrop-blur-sm rounded-sm p-8">
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

              <Button
                type="submit"
                className="w-full bg-brass text-charcoal hover:bg-brass-muted"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "Sending..." : "Send reset link"}
              </Button>
            </form>
          </Form>

          <p className="text-center text-warm-gray text-sm mt-6">
            Remembered it?{" "}
            <Link
              href="/members/login"
              className="text-brass-text hover:text-brass-muted transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>

        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-warm-gray text-sm hover:text-optical-white transition-colors"
          >
            &larr; Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
