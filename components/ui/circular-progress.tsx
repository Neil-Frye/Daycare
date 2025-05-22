"use client";

import React, { memo } from 'react';

interface CircularProgressProps {
  value: string;
  label: string;
}

// Using a more specific type for the component function if props are defined
const CircularProgressComponent: React.FC<CircularProgressProps> = ({ value, label }) => {
  return (
    <div className="flex flex-col items-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center border-4 border-green-300 mb-2">
        <span className="text-green-700 font-semibold text-lg">{value}</span>
      </div>
      <span className="text-sm text-gray-600">{label}</span>
    </div>
  );
};

export const CircularProgress = memo(CircularProgressComponent);
CircularProgress.displayName = 'CircularProgress';
