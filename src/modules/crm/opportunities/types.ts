export type DealAccount = {
  id: string;
  name: string;
};

export type DealContact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

export type Deal = {
  id: string;
  name: string;
  stage: string;
  value: number;
  probability: number | null;
  expectedCloseAt: string | null;
  account: DealAccount | null;
  contact: DealContact | null;
  leadId: string | null;
  ownerUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DealFormData = {
  name: string;
  stage?: string;
  value?: number;
  probability?: number;
  expectedCloseAt?: string;
  accountId?: string;
  contactId?: string;
  leadId?: string;
  ownerUserId?: string;
};

export type PaginatedDeals = {
  data: Deal[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
