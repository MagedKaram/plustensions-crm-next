'use server';

import {
  revalidatePath,
} from 'next/cache';

import {
  redirect,
} from 'next/navigation';

import {
  updateBankInvoice,
  deleteBankInvoice,
} from '@/lib/bank';

export async function saveBankInvoice(
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
    formData.get(
      'review_reason',
    ) || '',
  );

  await updateBankInvoice(
    id,
    status,
    notes,
    reviewReason,
  );

  revalidatePath('/bank');

  revalidatePath(
    `/bank/${id}`,
  );
}

export async function deleteBankInvoiceAction(
  id: number,
  formData: FormData,
) {
  const confirmation = String(
    formData.get(
      'delete_confirmation',
    ) || '',
  ).trim();

  if (
    confirmation !==
    'DELETE'
  ) {
    throw new Error(
      'Type DELETE to confirm invoice deletion.',
    );
  }

  await deleteBankInvoice(
    id,
  );

  revalidatePath('/bank');

  redirect('/bank');
}
