import { query } from './db';

type ColumnRow = {
  exists: boolean;
};

export async function hasColumn(tableName: string, columnName: string) {
  const rows = await query<ColumnRow>(
    `
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = $2
    ) AS exists
    `,
    [tableName, columnName],
  );

  return rows[0]?.exists === true;
}

export async function invoiceOptionalColumns() {
  const [customerPhone, customerFolderId] = await Promise.all([
    hasColumn('invoices', 'customer_phone'),
    hasColumn('invoices', 'customer_folder_id'),
  ]);

  return { customerPhone, customerFolderId };
}
