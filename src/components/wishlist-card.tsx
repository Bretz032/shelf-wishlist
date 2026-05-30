import { useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Check, ExternalLink, Trash2, BookOpen } from "lucide-react";
import type { WishlistItem } from "@/lib/types";

interface Props {
  item: WishlistItem;
  onPurchase: (id: string) => void;
  onDelete: (id: string) => void;
}

const typeLabel: Record<WishlistItem["type"], string> = {
  comic: "Comic",
  manga: "Manga",
  book: "Book",
};

export function WishlistCard({ item, onPurchase, onDelete }: Props) {
  const [imgError, setImgError] = useState(false);

  const price = (n: number | null) =>
    n != null
      ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : null;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.3 } }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="group relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-lg shadow-black/20 transition-shadow hover:shadow-xl hover:shadow-black/30"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        {item.cover_url && !imgError ? (
          <img
            src={item.cover_url}
            alt={`Cover of ${item.title}`}
            loading="lazy"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <BookOpen className="h-12 w-12 opacity-40" />
          </div>
        )}
        <Badge
          variant="secondary"
          className="absolute left-3 top-3 backdrop-blur bg-background/70 capitalize"
        >
          {typeLabel[item.type]}
        </Badge>
        {item.discount_percent != null && item.discount_percent > 0 && (
          <Badge className="absolute right-3 top-3 bg-[var(--discount)] text-[var(--discount-foreground)] hover:bg-[var(--discount)]">
            -{item.discount_percent}%
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <div>
          <h3 className="font-serif text-base leading-tight text-foreground line-clamp-2">
            {item.title}
          </h3>
          {item.author && (
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
              {item.author}
            </p>
          )}
        </div>

        <div className="mt-auto space-y-1 pt-1.5">
          {item.current_price != null ? (
            <div className="flex items-baseline gap-2">
              <span
                className={
                  item.discount_percent
                    ? "text-base font-semibold text-[var(--discount)]"
                    : "text-base font-semibold text-foreground"
                }
              >
                {price(item.current_price)}
              </span>
              {item.original_price != null &&
                item.original_price > item.current_price && (
                  <span className="text-xs text-muted-foreground line-through">
                    {price(item.original_price)}
                  </span>
                )}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">No price found</span>
          )}

          {item.price_source && (
            <a
              href={item.affiliate_url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
            >
              {item.price_source}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        <div className="mt-2 flex gap-2">
          <Button
            size="sm"
            variant="default"
            className="h-7 flex-1 text-xs"
            onClick={() => onPurchase(item.id)}
          >
            <Check className="mr-1 h-3.5 w-3.5" /> Purchased
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" aria-label="Delete">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete "{item.title}"?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes the item from your wishlist.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(item.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </motion.article>
  );
}
