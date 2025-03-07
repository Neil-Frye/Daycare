"use client";

import { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/types';

type Child = Database['public']['Tables']['children']['Row'];

interface ChildSelectorProps {
  onSelect: (childId: string) => void;
}

export function ChildSelector({ onSelect }: ChildSelectorProps) {
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>('');

  useEffect(() => {
    async function fetchChildren() {
      const { data: children, error } = await supabase
        .from('children')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching children:', error);
        return;
      }

      setChildren(children);
      if (children.length === 1) {
        setSelectedChild(children[0].id);
        onSelect(children[0].id);
      }
    }

    fetchChildren();
  }, [onSelect]);

  return (
    <Select
      value={selectedChild}
      onValueChange={(value) => {
        setSelectedChild(value);
        onSelect(value);
      }}
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select a child" />
      </SelectTrigger>
      <SelectContent>
        {children.map((child) => (
          <SelectItem key={child.id} value={child.id}>
            {child.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}