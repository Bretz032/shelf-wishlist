import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WishlistCard } from "@/components/wishlist-card";
import { AddItemDrawer } from "@/components/add-item-drawer";
import { BookOpen, LogOut, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import type { WishlistInsert, WishlistItem, WishlistType } from "@/lib/types";

export const Route = createFileRoute("/wishlist")({
  component: WishlistPage,
});

type Tab = "all" | WishlistType | "purchased";

function WishlistPage() {
  const { user, loading } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [user, loading, navigate]);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["wishlists", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<WishlistItem[]> => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (item: Omit<WishlistInsert, "user_id">) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("wishlists")
        .insert({ ...item, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wishlists"] });
      toast.success("Added to your shelf");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const purchaseMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("wishlists")
        .update({ purchased: true })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["wishlists"] });
      const prev = qc.getQueryData<WishlistItem[]>(["wishlists", user?.id]);
      qc.setQueryData<WishlistItem[]>(["wishlists", user?.id], (old) =>
        old?.map((i) => (i.id === id ? { ...i, purchased: true } : i)) ?? [],
      );
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(["wishlists", user?.id], ctx.prev);
      toast.error("Couldn't update");
    },
    onSuccess: () => toast.success("Item marked as purchased and removed from wishlist!"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("wishlists").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["wishlists"] });
      const prev = qc.getQueryData<WishlistItem[]>(["wishlists", user?.id]);
      qc.setQueryData<WishlistItem[]>(["wishlists", user?.id], (old) =>
        old?.filter((i) => i.id !== id) ?? [],
      );
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(["wishlists", user?.id], ctx.prev);
      toast.error("Couldn't delete");
    },
    onSuccess: () => toast.success("Removed"),
  });

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (tab === "purchased") {
        if (!i.purchased) return false;
      } else {
        if (i.purchased) return false;
        if (tab !== "all" && i.type !== tab) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !i.title.toLowerCase().includes(q) &&
          !(i.author?.toLowerCase().includes(q) ?? false)
        )
          return false;
      }
      return true;
    });
  }, [items, tab, search]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <BookOpen className="h-8 w-8 animate-pulse text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/40 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-serif text-xl leading-none text-foreground">Shelf</h1>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="mr-1.5 h-4 w-4" /> Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="comic">Comics</TabsTrigger>
              <TabsTrigger value="manga">Manga</TabsTrigger>
              <TabsTrigger value="book">Books</TabsTrigger>
              <TabsTrigger value="purchased">Purchased</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search shelf…"
              className="pl-9"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20 text-muted-foreground">
            Loading your shelf…
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState onAdd={() => setDrawerOpen(true)} />
        ) : (
          <motion.div
            layout
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
          >
            <AnimatePresence mode="popLayout">
              {filtered.map((item) => (
                <WishlistCard
                  key={item.id}
                  item={item}
                  onPurchase={(id) => purchaseMutation.mutate(id)}
                  onDelete={(id) => deleteMutation.mutate(id)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      <button
        onClick={() => setDrawerOpen(true)}
        aria-label="Add item"
        className="fixed bottom-6 right-6 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl shadow-primary/30 transition-transform hover:scale-105 active:scale-95"
      >
        <Plus className="h-6 w-6" />
      </button>

      <AddItemDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onSave={(item) => addMutation.mutateAsync(item)}
      />
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <BookOpen className="h-8 w-8" />
      </div>
      <h2 className="mt-5 font-serif text-2xl text-foreground">Your shelf is empty</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Start building your wishlist of comics, manga, and books. We'll track the
        lowest price for you.
      </p>
      <Button className="mt-6" onClick={onAdd}>
        <Plus className="mr-1.5 h-4 w-4" /> Add your first item
      </Button>
    </div>
  );
}
