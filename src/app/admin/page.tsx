import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminTabs } from "@/components/admin/AdminTabs";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/members/login");
  }

  return (
    <div className="min-h-screen bg-charcoal">
      <header className="pt-8 pb-6 px-6 border-b border-primary-foreground/10">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-serif font-bold text-optical-white">
            Admin
          </h1>
          <p className="text-warm-gray text-sm mt-1">
            Manage members and edit site content.
          </p>
        </div>
      </header>
      <main className="px-6 py-8">
        <div className="max-w-3xl mx-auto">
          <AdminTabs />
        </div>
      </main>
    </div>
  );
}
