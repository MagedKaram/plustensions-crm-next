'use server';

import {
  revalidatePath,
} from 'next/cache';

import {
  redirect,
} from 'next/navigation';

import {
  updateTaxInvoice,
  deleteTaxInvoice,
} from '@/lib/tax';

export async function saveTaxInvoice(
  id: number,
  formData: FormData,
) {
  const status = String(
    formData.get('status') ||
      'success',
  );

  const notes = String(
    formData.get('notes') ||
      '',
  );

  const reviewReason = String(
    formData.get('review_reason') ||
      '',
  );

  await updateTaxInvoice(
    id,
    status,
    notes,
    reviewReason,
  );

  revalidatePath(
    '/tax/invoices',
  );

  revalidatePath(
    `/tax/invoices/${id}`,
  );
}

export async function deleteTaxInvoiceAction(
  id: number,
  formData: FormData,
) {
  const confirmation = String(
    formData.get(
      'delete_confirmation',
    ) || '',
  ).trim();

  if (confirmation !== 'DELETE') {
    throw new Error(
      'Type DELETE to confirm invoice deletion.',
    );
  }

  await deleteTaxInvoice(id);

  revalidatePath('/tax');

  revalidatePath(
    '/tax/invoices',
  );

  redirect('/tax/invoices');
}
