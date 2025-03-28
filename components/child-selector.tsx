"use client";

import { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import supabase from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/types';

type Child = Database['public']['Tables']['children']['Row'];

interface ChildSelectorProps {
  onSelect: (childId: string) => void;
}

export function ChildSelector({ onSelect }: ChildSelectorProps) {
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchChildren() {
      try {
        setLoading(true);
        console.log('Fetching children from Supabase...');
        const { data: children, error, status } = await supabase
          .from('children')
          .select('*')
          .order('name');

        console.log('Supabase response:', { status, data: children, error });
        if (error) {
          console.error('Supabase error details:', error);
          throw error;
        }

        setChildren(children || []);
        if (children?.length === 1) {
          setSelectedChild(children[0].id);
          onSelect(children[0].id);
        }
      } catch (error) {
        console.error('Error fetching children:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchChildren();
  }, [onSelect]);

  if (loading) {
    return (
      <div className="w-[200px] h-10 bg-gray-100 rounded-md animate-pulse flex items-center justify-center">
        <span className="text-xs text-gray-500">Loading children...</span>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="w-[200px] h-10 flex flex-col items-center justify-center border rounded-md gap-1">
        <span className="text-sm text-gray-500">No children found</span>
        <button 
          onClick={() => window.location.reload()}
          className="text-xs text-blue-500 hover:underline"
        >
          Refresh
        </button>
      </div>
    );
  }

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
