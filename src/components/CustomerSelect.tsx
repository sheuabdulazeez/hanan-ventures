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
import { TCustomer } from "../types/database";
import { Button } from "./ui/button";

interface CustomerSelectProps {
  customers: TCustomer[];
  selectedCustomer: TCustomer | null;
  onSelect: (customer: TCustomer) => void;
  onAddNew: (customer: string) => void;
}

export function CustomerSelect({
  customers=[],
  selectedCustomer,
  onSelect,
  onAddNew,
}: CustomerSelectProps) {
  const [search, setSearch] = useState(selectedCustomer?.name || "");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const handleSelect = (customer: TCustomer) => {
    onSelect(customer);
    setSearch(customer.name);
    setOpen(false);
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

  useEffect(() => {
    setSearch(selectedCustomer?.name || "");
  }, [selectedCustomer]);

  return (
    <div ref={ref} className="relative">
      <Command className="rounded-lg border shadow-md" value={search}>
        <CommandInput
          placeholder="Search for a customer..."
          onFocus={() => setOpen(true)}
          value={search}
          onValueChange={(value) => setSearch(value)}
        />
        {open && (
          <CommandList className="absolute z-50 top-10 w-full mt-1 bg-white rounded-lg border shadow-lg">
            <CommandGroup className="max-h-64 overflow-auto">
              {customers?.map((customer) => (
                <CommandItem
                  key={customer.id}
                  onSelect={() => handleSelect(customer)}
                >
                  {customer.name}
                </CommandItem>
              ))}
            </CommandGroup>
            
            <CommandEmpty key={"create-customer"}>
              <Button onClick={() => onAddNew(search)}>
                Create "{search}" 

              </Button>
            </CommandEmpty>
          </CommandList>
        )}
      </Command>
    </div>
  );
}
