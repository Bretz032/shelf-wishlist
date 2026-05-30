import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useServerFn } from "@tanstack/react-start";
import { fetchPrices } from "@/lib/prices.functions";
import { searchCover } from "@/lib/openlibrary";
import { Loader2, Search, BookOpen } from "lucide-react";
import { toast } from "sonner";
import type { WishlistInsert, WishlistType } from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (item: Omit<WishlistInsert, "user_id">) => Promise<void>;
}

export function AddItemDrawer({ open, onOpenChange, onSave }: Props) {
  const fetchPricesFn = useServerFn(fetchPrices);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [type, setType] = useState<WishlistType>("book");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [currentPrice, setCurrentPrice] = useState<string>("");
  const [originalPrice, setOriginalPrice] = useState<string>("");
  const [source, setSource] = useState<string>("");
  const [affiliate, setAffiliate] = useState<string>("");
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  function reset() {
    setTitle("");
    setAuthor("");
    setType("book");
    setCoverUrl(null);
    setCurrentPrice("");
    setOriginalPrice("");
    setSource("");
    setAffiliate("");
  }

  async function onSearch() {
    if (!title.trim()) {
      toast.error("Enter a title first");
      return;
    }
    setSearching(true);
    try {
      const price = await fetchPricesFn({ data: { title } }).catch((e) => {
        console.error(e);
        toast.error("Couldn't fetch prices");
        return null;
      });
      const cover = price?.cover_url ?? (await searchCover(title));
      setCoverUrl(cover);
      if (price) {
        setCurrentPrice(price.current_price?.toString() ?? "");
        setOriginalPrice(price.original_price?.toString() ?? "");
        setSource(price.price_source ?? "");
        setAffiliate(price.affiliate_url ?? "");
        if (!cover && !price.current_price) {
          toast.message("Nothing found — you can still add it manually");
        }
      }
    } finally {
      setSearching(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const current = currentPrice ? parseFloat(currentPrice) : null;
    const original = originalPrice ? parseFloat(originalPrice) : null;
    const discount =
      original && current && original > current
        ? Math.round(((original - current) / original) * 100)
        : null;
    try {
      await onSave({
        title: title.trim(),
        author: author.trim() || null,
        type,
        cover_url: coverUrl,
        current_price: current,
        original_price: original,
        discount_percent: discount,
        price_source: source || null,
        affiliate_url: affiliate || null,
      });
      reset();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-serif text-2xl">Add to your shelf</SheetTitle>
          <SheetDescription>
            Search any comic, manga, or book — we'll find the cover and lowest price.
          </SheetDescription>
        </SheetHeader>

        <form className="mt-6 space-y-4 px-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Berserk Deluxe Edition Volume 1"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="author">Author (optional)</Label>
            <Input id="author" value={author} onChange={(e) => setAuthor(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as WishlistType)}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="comic">Comic</SelectItem>
                <SelectItem value="manga">Manga</SelectItem>
                <SelectItem value="book">Book</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={onSearch}
            disabled={searching}
          >
            {searching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            Search cover & price
          </Button>

          <div className="rounded-xl border bg-muted/30 p-3">
            <div className="flex gap-3">
              <div className="relative aspect-[2/3] w-24 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                {coverUrl ? (
                  <img src={coverUrl} alt="Cover preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <BookOpen className="h-6 w-6 opacity-50" />
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <div className="space-y-1">
                  <Label htmlFor="cp" className="text-xs">
                    Current price
                  </Label>
                  <Input
                    id="cp"
                    type="number"
                    step="0.01"
                    value={currentPrice}
                    onChange={(e) => setCurrentPrice(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="op" className="text-xs">
                    Original price
                  </Label>
                  <Input
                    id="op"
                    type="number"
                    step="0.01"
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <Label htmlFor="src" className="text-xs">
                Store
              </Label>
              <Input
                id="src"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g. Amazon"
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save to wishlist
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
