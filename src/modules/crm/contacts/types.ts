export type ContactAccount = {
  id: string;
  name: string;
};

export type Contact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  source: string | null;
  account: ContactAccount | null;
  createdAt: string;
  updatedAt: string;
};

export type ContactFormData = {
  name: string;
  email?: string;
  phone?: string;
  title?: string;
  source?: string;
  accountId?: string;
};

export type PaginatedContacts = {
  data: Contact[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
