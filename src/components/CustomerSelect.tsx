"use client";

import { useEffect, useRef, useState } from "react";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../components/ui/command";
import { TCustomer } from "../types/database";

interface CustomerSelectProps {
  customers: TCustomer[];
  onSelect: (customer: TCustomer) => void;
  onAddNew: (customer: string) => void;
}

export function CustomerSelect({
  customers,
  onSelect,
  onAddNew,
}: CustomerSelectProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(search.toLowerCase())
  );

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

  return (
    <div ref={ref} className="relative">
      <Command className="rounded-lg border shadow-md">
        <CommandInput
          placeholder="Search for a customer..."
          value={search}
          onValueChange={(value) => {
            setSearch(value);
            setOpen(true);
          }}
        />
        {open && search && (
          <CommandList className="absolute z-50 top-10 w-full mt-1 bg-white rounded-lg border shadow-lg">
            <CommandGroup className="max-h-64 overflow-auto">
              {/* {filteredCustomers.length && ( */}
                <CommandItem onSelect={() => onAddNew(search)}>
                  Create "{search}"
                </CommandItem>
              {/* // )} */}
              {filteredCustomers.map((customer) => (
                <CommandItem
                  key={customer.id}
                  onSelect={() => handleSelect(customer)}
                >
                  {customer.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        )}
      </Command>
    </div>
  );
}
