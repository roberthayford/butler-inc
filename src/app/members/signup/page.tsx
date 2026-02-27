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

const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().min(10, "Please enter a valid phone number"),
});

type SignupForm = z.infer<typeof signupSchema>;

export default function SignUpPage() {
  const { signUp } = useAuth();
  const router = useRouter();

  const form = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "", phone: "" },
  });

  const onSubmit = async (data: SignupForm) => {
    const { error } = await signUp(data.email, data.password, data.name);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created! Please check your email to verify.");
    router.push("/members/login");
  };

  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif font-bold text-optical-white">
            Join Butlers Inc.
          </h1>
          <p className="text-warm-gray mt-2">
            Create your account to get started
          </p>
        </div>

        <div className="bg-primary-foreground/5 border border-primary-foreground/10 backdrop-blur-sm rounded-xl p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-optical-white">
                      Full Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Jane Smith"
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
                    <FormLabel className="text-optical-white">
                      Password
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
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-optical-white">Phone</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="07700 900000"
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
                {form.formState.isSubmitting
                  ? "Creating account..."
                  : "Create Account"}
              </Button>
            </form>
          </Form>

          <p className="text-center text-warm-gray text-sm mt-6">
            Already have an account?{" "}
            <Link
              href="/members/login"
              className="text-brass hover:text-brass-muted transition-colors"
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
