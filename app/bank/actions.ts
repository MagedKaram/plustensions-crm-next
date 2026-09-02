'use server';

import {
  revalidatePath,
} from 'next/cache';

import {
  deleteBankInvoice,
} from '@/lib/bank';

export async function deleteExpenseInvoiceAction(
  id: number,
  _formData: FormData,
) {
  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    throw new Error(
      'Invalid invoice ID',
    );
  }

  await deleteBankInvoice(id);

  revalidatePath('/bank');
}
