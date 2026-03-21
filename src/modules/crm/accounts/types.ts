export type Account = {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  address: string | null;
  ownerUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AccountFormData = {
  name: string;
  industry?: string;
  website?: string;
  address?: string;
  ownerUserId?: string;
};

export type PaginatedAccounts = {
  data: Account[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
