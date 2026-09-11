"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import type { Control, FieldPath, FieldValues } from "react-hook-form";
import { Controller } from "react-hook-form";
import { Field, FieldLabel } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface TagOption {
  id: number;
  name: string;
}

export function TagMultiSelect<TFieldValues extends FieldValues>({
  name,
  control,
  label,
  options,
}: {
  name: FieldPath<TFieldValues>;
  control: Control<TFieldValues>;
  label: string;
  options: TagOption[];
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const selectedIds: number[] = field.value ?? [];
        const selected = options.filter((o) => selectedIds.includes(o.id));

        function toggle(id: number) {
          const next = selectedIds.includes(id)
            ? selectedIds.filter((v) => v !== id)
            : [...selectedIds, id];
          field.onChange(next);
        }

        return (
          <Field>
            <FieldLabel htmlFor={name}>{label}</FieldLabel>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  id={name}
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="h-auto min-h-9 w-full justify-between font-normal"
                >
                  <span className="flex flex-wrap gap-1">
                    {selected.length === 0 ? (
                      <span className="text-muted-foreground">Select tags...</span>
                    ) : (
                      selected.map((tag) => (
                        <Badge key={tag.id} variant="secondary" className="gap-1">
                          {tag.name}
                          <span
                            role="button"
                            tabIndex={-1}
                            aria-label={`Remove ${tag.name}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggle(tag.id);
                            }}
                            className="rounded-full hover:bg-muted-foreground/20"
                          >
                            <X className="size-3" />
                          </span>
                        </Badge>
                      ))
                    )}
                  </span>
                  <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Search tags..." />
                  <CommandList>
                    <CommandEmpty>No tags found.</CommandEmpty>
                    <CommandGroup>
                      {options.map((tag) => (
                        <CommandItem key={tag.id} value={tag.name} onSelect={() => toggle(tag.id)}>
                          <Check
                            className={cn(
                              "mr-2 size-4",
                              selectedIds.includes(tag.id) ? "opacity-100" : "opacity-0",
                            )}
                          />
                          {tag.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </Field>
        );
      }}
    />
  );
}
