export type DeleteInvoiceRoute =
  | 'current'
  | 'bank';

type DeleteResult = {
  ok: boolean;
  type?: string;
  route?: string;
  id?: number;
  sheet_deleted?: boolean;
  database_deleted?: boolean;
  error?: string;
};

export async function deleteInvoiceEverywhere(
  id: number,
  route: DeleteInvoiceRoute,
): Promise<DeleteResult> {
  const webhookUrl =
    process.env.N8N_DELETE_INVOICE_WEBHOOK_URL;

  const token =
    process.env.N8N_WEBHOOK_TOKEN;

  if (!webhookUrl) {
    throw new Error(
      'N8N_DELETE_INVOICE_WEBHOOK_URL is not configured',
    );
  }

  if (!token) {
    throw new Error(
      'N8N_WEBHOOK_TOKEN is not configured',
    );
  }

  const response = await fetch(
    webhookUrl,
    {
      method: 'POST',

      headers: {
        'Content-Type':
          'application/json',

        'X-CRM-Token':
          token,
      },

      body: JSON.stringify({
        id,
        route,
      }),

      cache: 'no-store',
    },
  );

  const text =
    await response.text();

  let result:
    DeleteResult;

  try {
    result =
      text
        ? JSON.parse(text)
        : {
            ok:
              response.ok,
          };
  } catch {
    result = {
      ok: false,
      error:
        text ||
        'Invalid response from n8n',
    };
  }

  if (
    !response.ok ||
    !result.ok
  ) {
    throw new Error(
      result.error ||
        `Delete failed with status ${response.status}`,
    );
  }

  return result;
}
