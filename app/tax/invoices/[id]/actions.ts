'use server';

import { revalidatePath } from 'next/cache';
import { updateTaxInvoice } from '@/lib/tax';

export async function saveTaxInvoice(id: number, formData: FormData) {
  const status = String(formData.get('status') || 'success');
  const notes = String(formData.get('notes') || '');
  const reviewReason = String(formData.get('review_reason') || '');
  await updateTaxInvoice(id, status, notes, reviewReason);
  revalidatePath(`/tax/invoices/${id}`);
}
