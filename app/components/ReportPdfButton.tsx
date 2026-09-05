'use client';

import {
  useState,
} from 'react';

type Transaction = {
  processed_at: string;
  category: string;
  company_name: string;
  invoice_number: string;
  invoice_date: string;
  vat_number: string;
  currency: string;

  subtotal_excl_vat:
    | string
    | null;

  shipping_amount:
    | string
    | null;

  discount_amount:
    | string
    | null;

  vat_rate:
    | string
    | null;

  vat_amount:
    | string
    | null;

  total_amount:
    | string
    | null;

  payment_method:
    | string
    | null;

  iban:
    | string
    | null;

  payment_reference:
    | string
    | null;

  line_items: unknown;

  google_drive_url:
    | string
    | null;

  processed_file_name:
    | string
    | null;

  status:
    | string
    | null;

  notes:
    | string
    | null;
};

type Summary = {
  currency: string;
  invoice_count: string;
  subtotal: string;
  shipping: string;
  discount: string;
  vat: string;
  total: string;
};

type Monthly = {
  month: string;
  currency: string;
  invoice_count: string;
  subtotal: string;
  vat: string;
  total: string;
};

type Props = {
  reportTitle: string;
  periodLabel: string;

  fileName: string;

  transactions:
    Transaction[];

  summary:
    Summary[];

  monthlyBreakdown:
    Monthly[];
};

function text(
  value: unknown,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return '';
  }

  if (
    typeof value ===
    'object'
  ) {
    try {
      return JSON.stringify(
        value,
      );
    } catch {
      return String(value);
    }
  }

  return String(value);
}

function money(
  value: unknown,
) {
  const n =
    Number(value);

  if (
    !Number.isFinite(n)
  ) {
    return text(value);
  }

  return n.toLocaleString(
    'en-US',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  );
}

async function
loadLogoDataUrl() {
  try {
    const response =
      await fetch(
        '/plustensions-logo.png',
      );

    if (!response.ok) {
      return null;
    }

    const blob =
      await response.blob();

    return await new Promise<
      string
    >(
      (
        resolve,
        reject,
      ) => {
        const reader =
          new FileReader();

        reader.onload =
          () =>
            resolve(
              String(
                reader.result,
              ),
            );

        reader.onerror =
          reject;

        reader.readAsDataURL(
          blob,
        );
      },
    );
  } catch {
    return null;
  }
}

export function
ReportPdfButton({
  reportTitle,
  periodLabel,
  fileName,
  transactions,
  summary,
  monthlyBreakdown,
}: Props) {
  const [
    loading,
    setLoading,
  ] = useState(false);

  async function
  downloadPdf() {
    try {
      setLoading(true);

      const [
        jspdfModule,
        autoTableModule,
      ] =
        await Promise.all([
          import('jspdf'),
          import(
            'jspdf-autotable'
          ),
        ]);

      const {
        jsPDF,
      } = jspdfModule;

      const autoTable =
        autoTableModule.default;

      const doc =
        new jsPDF({
          orientation:
            'landscape',
          unit: 'mm',
          format: 'a4',
        });

      const pageWidth =
        doc.internal.pageSize
          .getWidth();

      const logo =
        await loadLogoDataUrl();

      if (logo) {
        try {
          doc.addImage(
            logo,
            'PNG',
            14,
            8,
            20,
            20,
          );
        } catch {
          // Keep report usable
          // even if image decoding
          // fails.
        }
      }

      doc.setFont(
        'helvetica',
        'bold',
      );

      doc.setFontSize(20);

      doc.text(
        'PlusTensions',
        40,
        15,
      );

      doc.setFontSize(13);

      doc.text(
        reportTitle,
        40,
        22,
      );

      doc.setFont(
        'helvetica',
        'normal',
      );

      doc.setFontSize(10);

      doc.text(
        periodLabel,
        40,
        28,
      );

      doc.setFontSize(8);

      doc.text(
        `Generated: ${new Date()
          .toLocaleString(
            'en-GB',
          )}`,
        pageWidth - 14,
        14,
        {
          align: 'right',
        },
      );

      autoTable(
        doc,
        {
          startY: 36,

          head: [[
            'Currency',
            'Invoices',
            'Subtotal',
            'Shipping',
            'Discount',
            'VAT',
            'Total',
          ]],

          body:
            summary.map(
              (row) => [
                row.currency,
                row.invoice_count,
                money(
                  row.subtotal,
                ),
                money(
                  row.shipping,
                ),
                money(
                  row.discount,
                ),
                money(row.vat),
                money(row.total),
              ],
            ),

          theme: 'grid',

          styles: {
            fontSize: 8,
            cellPadding: 2,
          },

          headStyles: {
            fillColor: [
              174,
              124,
              91,
            ],
          },
        },
      );

      if (
        monthlyBreakdown
          .length
      ) {
        doc.addPage();

        doc.setFont(
          'helvetica',
          'bold',
        );

        doc.setFontSize(14);

        doc.text(
          'Monthly Breakdown',
          14,
          16,
        );

        autoTable(
          doc,
          {
            startY: 22,

            head: [[
              'Month',
              'Currency',
              'Invoices',
              'Subtotal',
              'VAT',
              'Total',
            ]],

            body:
              monthlyBreakdown.map(
                (row) => [
                  row.month,
                  row.currency,
                  row.invoice_count,

                  money(
                    row.subtotal,
                  ),

                  money(
                    row.vat,
                  ),

                  money(
                    row.total,
                  ),
                ],
              ),

            theme: 'grid',

            styles: {
              fontSize: 8,
              cellPadding: 2,
            },

            headStyles: {
              fillColor: [
                174,
                124,
                91,
              ],
            },
          },
        );
      }

      doc.addPage();

      doc.setFont(
        'helvetica',
        'bold',
      );

      doc.setFontSize(14);

      doc.text(
        'Transactions',
        14,
        16,
      );

      const transactionHead =
        [[
          'Processed At',
          'Category',
          'Company',
          'Invoice #',
          'Invoice Date',
          'VAT #',
          'Currency',
          'Subtotal excl. VAT',
          'Shipping',
          'Discount',
          'VAT Rate',
          'VAT Amount',
          'Total',
          'Payment Method',
          'IBAN',
          'Payment Reference',
          'Line Items',
          'Google Drive URL',
          'Processed File Name',
          'Status',
          'Notes',
        ]];

      const transactionBody =
        transactions.map(
          (row) => [
            text(
              row.processed_at,
            ),

            text(
              row.category,
            ),

            text(
              row.company_name,
            ),

            text(
              row.invoice_number,
            ),

            text(
              row.invoice_date,
            ),

            text(
              row.vat_number,
            ),

            text(
              row.currency,
            ),

            money(
              row
                .subtotal_excl_vat,
            ),

            money(
              row
                .shipping_amount,
            ),

            money(
              row
                .discount_amount,
            ),

            text(
              row.vat_rate,
            ),

            money(
              row.vat_amount,
            ),

            money(
              row.total_amount,
            ),

            text(
              row.payment_method,
            ),

            text(row.iban),

            text(
              row
                .payment_reference,
            ),

            text(
              row.line_items,
            ),

            text(
              row
                .google_drive_url,
            ),

            text(
              row
                .processed_file_name,
            ),

            text(
              row.status,
            ),

            text(
              row.notes,
            ),
          ],
        );

      autoTable(
        doc,
        {
          startY: 22,

          head:
            transactionHead,

          body:
            transactionBody,

          theme: 'grid',

          styles: {
            fontSize: 5.5,
            cellPadding: 1.1,
            overflow:
              'linebreak',
            valign: 'top',
          },

          headStyles: {
            fillColor: [
              174,
              124,
              91,
            ],

            fontSize: 5.5,
          },

          horizontalPageBreak:
            true,

          horizontalPageBreakRepeat:
            [0, 2, 3, 4],

          horizontalPageBreakBehaviour:
            'immediately',

          margin: {
            top: 14,
            left: 8,
            right: 8,
            bottom: 14,
          },
        },
      );

      /*
       * Add a clean clickable
       * invoice-links appendix.
       */
      if (
        transactions.some(
          (row) =>
            !!row.google_drive_url,
        )
      ) {
        doc.addPage();

        doc.setFont(
          'helvetica',
          'bold',
        );

        doc.setFontSize(14);

        doc.text(
          'Invoice File Links',
          14,
          16,
        );

        let y = 26;

        transactions.forEach(
          (
            row,
            index,
          ) => {
            if (
              !row.google_drive_url
            ) {
              return;
            }

            if (y > 190) {
              doc.addPage();
              y = 18;
            }

            doc.setFont(
              'helvetica',
              'normal',
            );

            doc.setFontSize(8);

            const label =
              `${index + 1}. ` +
              `${row.invoice_date || ''} | ` +
              `${row.company_name || ''} | ` +
              `${row.invoice_number || ''}`;

            doc.text(
              label.slice(
                0,
                120,
              ),
              14,
              y,
            );

            doc.setTextColor(
              0,
              0,
              200,
            );

            doc.textWithLink(
              'Open invoice file',
              230,
              y,
              {
                url:
                  row
                    .google_drive_url,
              },
            );

            doc.setTextColor(
              0,
              0,
              0,
            );

            y += 7;
          },
        );
      }

      const pageCount =
        doc.getNumberOfPages();

      for (
        let page = 1;
        page <= pageCount;
        page += 1
      ) {
        doc.setPage(page);

        doc.setFont(
          'helvetica',
          'normal',
        );

        doc.setFontSize(7);

        doc.setTextColor(
          90,
          90,
          90,
        );

        doc.text(
          'PlusTensions CRM',
          14,
          204,
        );

        doc.text(
          `Page ${page} of ${pageCount}`,
          pageWidth - 14,
          204,
          {
            align: 'right',
          },
        );
      }

      doc.save(
        `${fileName}.pdf`,
      );
    } catch (error) {
      console.error(error);

      alert(
        'Could not generate PDF report.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className="btn btn-primary"
      onClick={downloadPdf}
      disabled={loading}
    >
      {loading
        ? 'Generating PDF...'
        : 'Download PDF'}
    </button>
  );
}
