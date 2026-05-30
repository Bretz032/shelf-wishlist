import type { Database } from "@/integrations/supabase/types";

export type WishlistItem = Database["public"]["Tables"]["wishlists"]["Row"];
export type WishlistInsert = Database["public"]["Tables"]["wishlists"]["Insert"];
export type WishlistType = Database["public"]["Enums"]["wishlist_item_type"];
