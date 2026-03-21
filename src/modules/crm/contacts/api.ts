import { api, ensureApiSession, getApiErrorMessage } from "@/services/api-client";
import type { Contact, ContactFormData, PaginatedContacts } from "./types";

function rethrow(error: unknown, fallback: string): never {
  throw new Error(getApiErrorMessage(error, fallback));
}

export async function fetchContacts(params: {
  search?: string;
  accountId?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedContacts> {
  try {
    await ensureApiSession();
    const response = await api.get<PaginatedContacts>("/contacts", { params });
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to load contacts.");
  }
}

export async function fetchContact(id: string): Promise<Contact> {
  try {
    await ensureApiSession();
    const response = await api.get<Contact>(`/contacts/${id}`);
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to load contact.");
  }
}

export async function createContact(data: ContactFormData): Promise<Contact> {
  try {
    await ensureApiSession();
    const response = await api.post<Contact>("/contacts", data);
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to create contact.");
  }
}

export async function updateContact(id: string, data: ContactFormData): Promise<Contact> {
  try {
    await ensureApiSession();
    const response = await api.patch<Contact>(`/contacts/${id}`, data);
    return response.data;
  } catch (error) {
    rethrow(error, "Failed to update contact.");
  }
}

export async function deleteContact(id: string): Promise<void> {
  try {
    await ensureApiSession();
    await api.delete(`/contacts/${id}`);
  } catch (error) {
    rethrow(error, "Failed to delete contact.");
  }
}
