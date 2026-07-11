import {
  Wallet,
  Smartphone,
  Laptop,
  KeyRound,
  BookUser,
  IdCard,
  Backpack,
  Gem,
  PawPrint,
  Bike,
  Cable,
  UserRound,
  Package,
  type LucideIcon,
} from "lucide-react";
import type { Category } from "./types";

export interface CategoryDef {
  id: Category;
  label: string;
  icon: LucideIcon;
  sensitive?: boolean;
}

export const CATEGORIES: CategoryDef[] = [
  { id: "wallet", label: "Wallet", icon: Wallet },
  { id: "phone", label: "Phone", icon: Smartphone },
  { id: "laptop", label: "Laptop", icon: Laptop },
  { id: "keys", label: "Keys", icon: KeyRound },
  { id: "passport", label: "Passport / ID", icon: BookUser },
  { id: "license", label: "Driving License", icon: IdCard },
  { id: "bag", label: "Bag / Luggage", icon: Backpack },
  { id: "jewelry", label: "Jewelry", icon: Gem },
  { id: "pet", label: "Pet", icon: PawPrint },
  { id: "bicycle", label: "Bicycle", icon: Bike },
  { id: "electronics", label: "Electronics", icon: Cable },
  { id: "person", label: "Person", icon: UserRound, sensitive: true },
  { id: "other", label: "Other", icon: Package },
];

export const categoryDef = (id: Category): CategoryDef =>
  CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
