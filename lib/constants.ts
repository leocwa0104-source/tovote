
export const PACKAGES = {
  daily: { 
    id: 'daily', 
    label: 'Daily', 
    price: 2,
    tickets: 3, 
    limitMs: 24 * 60 * 60 * 1000 
  },
  weekly: { 
    id: 'weekly', 
    label: 'Weekly', 
    price: 10,
    tickets: 15, 
    limitMs: 7 * 24 * 60 * 60 * 1000 
  },
  monthly: { 
    id: 'monthly', 
    label: 'Monthly', 
    price: 30,
    tickets: 60, 
    limitMs: 30 * 24 * 60 * 60 * 1000 
  }
} as const;

export type PackageId = keyof typeof PACKAGES;
// export type Currency = 'CNY'; // Only CNY supported now
