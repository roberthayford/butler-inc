import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminEditor } from "@/components/admin/AdminEditor";

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
            Content Editor
          </h1>
          <p className="text-warm-gray text-sm mt-1">
            Edit butler page headlines, descriptions, and details.
          </p>
        </div>
      </header>
      <main className="px-6 py-8">
        <div className="max-w-3xl mx-auto">
          <AdminEditor />
        </div>
      </main>
    </div>
  );
}
