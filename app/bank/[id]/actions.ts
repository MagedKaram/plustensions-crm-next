'use server';

import { revalidatePath } from 'next/cache';

import { updateBankInvoice } from '@/lib/bank';

export async function saveBankInvoice(id: number, formData: FormData) {
  const status = String(formData.get('status') || 'success');
  const notes = String(formData.get('notes') || '');
  const reviewReason = String(formData.get('review_reason') || '');

  await updateBankInvoice(id, status, notes, reviewReason);

  revalidatePath('/bank');
  revalidatePath(`/bank/${id}`);
}
