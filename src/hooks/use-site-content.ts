"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { updateButlerContent } from "@/app/admin/actions";
import type { ButlerContent } from "@/data/content-schema";

interface SiteContentRow {
  page_slug: string;
  content: ButlerContent;
  updated_at: string;
}

export function useAllContent() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["site-content"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_content")
        .select("page_slug, content, updated_at")
        .order("page_slug");

      if (error) throw error;
      return data as SiteContentRow[];
    },
  });
}

export function useUpdateContent(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: ButlerContent) => {
      const result = await updateButlerContent(slug, content);
      if (result.error) throw new Error(result.error);
      return result;
    },

    onMutate: async (newContent) => {
      await queryClient.cancelQueries({ queryKey: ["site-content"] });
      const previous = queryClient.getQueryData<SiteContentRow[]>(["site-content"]);

      queryClient.setQueryData<SiteContentRow[]>(["site-content"], (old) =>
        old?.map((row) =>
          row.page_slug === slug ? { ...row, content: newContent } : row
        )
      );

      return { previous };
    },

    onError: (_err, _newContent, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["site-content"], context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["site-content"] });
    },
  });
}
