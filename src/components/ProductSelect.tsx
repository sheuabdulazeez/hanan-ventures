"use client";

import { useEffect, useRef, useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../components/ui/command";
import { TProduct } from "../types/database";

interface ProductSelectProps {
  products: TProduct[];
  onSelect: (product: TProduct) => void;
}

export function ProductSelect({ products, onSelect }: ProductSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const handleSelect = (product: TProduct) => {
    onSelect(product);
    setOpen(false)
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div ref={ref} className="relative">
      <Command className="rounded-lg border shadow-md">
        <CommandInput
          placeholder="Search for a product..."
          onFocus={() => setOpen(true)}
        />
        {open && (
          <CommandList className="absolute z-50 top-10 w-full mt-1 bg-white rounded-lg border shadow-lg">
            <CommandEmpty>No products found.</CommandEmpty>
            <CommandGroup
              key={"product-heading"}
              className="max-h-64 overflow-auto"
              heading="Products"
            >
              {products.map((product) => (
                <CommandItem
                  key={product.id.toString()}
                  onSelect={() => handleSelect(product)}
                >
                  {product.name} - ₦{product.selling_price.toFixed(2)} (
                  {product.quantity_on_hand})
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        )}
      </Command>
    </div>
  );
}
