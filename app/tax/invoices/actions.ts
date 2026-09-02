'use server';

import { revalidatePath } from 'next/cache';
import { deleteTaxInvoice } from '@/lib/tax';

export async function deleteGoodsInvoiceAction(
  id: number,
  _formData: FormData,
) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('Invalid invoice ID');
  }

  await deleteTaxInvoice(id);

  revalidatePath('/tax');
  revalidatePath('/tax/invoices');
}
