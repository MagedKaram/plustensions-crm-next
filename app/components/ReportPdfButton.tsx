'use client';

import { useState } from 'react';

type Transaction = {
  processed_at: string;
  category: string;
  company_name: string;
  invoice_number: string;
  invoice_date: string;
  vat_number: string;
  currency: string;
  subtotal_excl_vat: string | null;
  shipping_amount: string | null;
  discount_amount: string | null;
  vat_rate: string | null;
  vat_amount: string | null;
  total_amount: string | null;
  payment_method: string | null;
  iban: string | null;
  payment_reference: string | null;
  line_items: unknown;
  google_drive_url: string | null;
  processed_file_name: string | null;
  status: string | null;
  notes: string | null;
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
  transactions: Transaction[];
  summary: Summary[];
  monthlyBreakdown: Monthly[];
};

function asText(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  return String(value);
}

function money(value: unknown) {
  const n = Number(value);

  if (!Number.isFinite(n)) {
    return '0.00';
  }

  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

async function loadLogoDataUrl() {
  try {
    const response = await fetch('/plustensions-logo.png');

    if (!response.ok) {
      return null;
    }

    const blob = await response.blob();

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;

      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export function ReportPdfButton({
  reportTitle,
  periodLabel,
  fileName,
  transactions,
  summary,
  monthlyBreakdown,
}: Props) {
  const [loading, setLoading] = useState(false);

  async function downloadPdf() {
    try {
      setLoading(true);

      const [{ jsPDF }, autoTableModule] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);

      const autoTable = autoTableModule.default;

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const logo = await loadLogoDataUrl();

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      const brandColor: [number, number, number] = [174, 124, 91];
      const darkText: [number, number, number] = [35, 35, 35];
      const mutedText: [number, number, number] = [110, 110, 110];
      const lightFill: [number, number, number] = [248, 246, 243];
      const borderColor: [number, number, number] = [227, 221, 214];

      function drawHeader() {
        doc.setFillColor(...lightFill);
        doc.roundedRect(10, 8, pageWidth - 20, 24, 4, 4, 'F');

        if (logo) {
          try {
            doc.addImage(logo, 'PNG', 14, 11, 14, 14);
          } catch {
            // keep going if image fails
          }
        }

        doc.setTextColor(...darkText);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text('PlusTensions', 32, 16);

        doc.setFontSize(12);
        doc.text(reportTitle, 32, 23);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...mutedText);
        doc.text(periodLabel, 32, 28);

        doc.setTextColor(...mutedText);
        doc.setFontSize(8);
        doc.text(
          `Generated: ${new Date().toLocaleString('en-GB')}`,
          pageWidth - 14,
          16,
          { align: 'right' }
        );
      }

      function drawFooter() {
        const pageCount = doc.getNumberOfPages();

        for (let i = 1; i <= pageCount; i += 1) {
          doc.setPage(i);
          doc.setDrawColor(...borderColor);
          doc.line(10, pageHeight - 10, pageWidth - 10, pageHeight - 10);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(...mutedText);
          doc.text('PlusTensions CRM', 12, pageHeight - 6);
          doc.text(`Page ${i} of ${pageCount}`, pageWidth - 12, pageHeight - 6, {
            align: 'right',
          });
        }
      }

      drawHeader();

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...darkText);
      doc.text('Summary', 12, 42);

      autoTable(doc, {
        startY: 46,
        head: [[
          'Currency',
          'Invoices',
          'Subtotal',
          'VAT',
          'Shipping',
          'Discount',
          'Total',
        ]],
        body: summary.map((row) => [
          row.currency || '—',
          row.invoice_count || '0',
          money(row.subtotal),
          money(row.vat),
          money(row.shipping),
          money(row.discount),
          money(row.total),
        ]),
        theme: 'grid',
        margin: { left: 12, right: 12 },
        styles: {
          fontSize: 9,
          cellPadding: 3,
          textColor: darkText,
          lineColor: borderColor,
          lineWidth: 0.1,
          halign: 'center',
          valign: 'middle',
        },
        headStyles: {
          fillColor: brandColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
        },
        bodyStyles: {
          fillColor: [255, 255, 255],
        },
        alternateRowStyles: {
          fillColor: [252, 252, 252],
        },
      });

      if (monthlyBreakdown.length) {
        const afterSummaryY =
          // @ts-expect-error jspdf-autotable internal field
          (doc.lastAutoTable?.finalY || 46) + 10;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(...darkText);
        doc.text('Monthly Breakdown', 12, afterSummaryY);

        autoTable(doc, {
          startY: afterSummaryY + 4,
          head: [[
            'Month',
            'Currency',
            'Invoices',
            'Subtotal',
            'VAT',
            'Total',
          ]],
          body: monthlyBreakdown.map((row) => [
            row.month,
            row.currency,
            row.invoice_count,
            money(row.subtotal),
            money(row.vat),
            money(row.total),
          ]),
          theme: 'grid',
          margin: { left: 12, right: 12 },
          styles: {
            fontSize: 8.5,
            cellPadding: 2.7,
            textColor: darkText,
            lineColor: borderColor,
            lineWidth: 0.1,
            halign: 'center',
            valign: 'middle',
          },
          headStyles: {
            fillColor: brandColor,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center',
          },
          alternateRowStyles: {
            fillColor: [252, 252, 252],
          },
        });
      }

      doc.addPage();
      drawHeader();

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...darkText);
      doc.text('Transactions', 12, 42);

      const rows = transactions.map((row) => ({
        date: asText(row.invoice_date),
        company: asText(row.company_name),
        invoice: asText(row.invoice_number),
        vat: asText(row.vat_number),
        currency: asText(row.currency),
        subtotal: money(row.subtotal_excl_vat),
        vatAmount: money(row.vat_amount),
        total: money(row.total_amount),
        status: asText(row.status),
        file: row.google_drive_url ? 'Open' : '—',
        fileUrl: row.google_drive_url || '',
      }));

      autoTable(doc, {
        startY: 46,
        head: [[
          'Date',
          'Company',
          'Invoice #',
          'VAT #',
          'Currency',
          'Subtotal',
          'VAT',
          'Total',
          'Status',
          'File',
        ]],
        body: rows.map((row) => [
          row.date,
          row.company,
          row.invoice,
          row.vat,
          row.currency,
          row.subtotal,
          row.vatAmount,
          row.total,
          row.status,
          row.file,
        ]),
        theme: 'grid',
        margin: { left: 8, right: 8 },
        styles: {
          fontSize: 8,
          cellPadding: 2.2,
          textColor: darkText,
          lineColor: borderColor,
          lineWidth: 0.1,
          valign: 'middle',
          overflow: 'linebreak',
        },
        headStyles: {
          fillColor: brandColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 8.5,
        },
        bodyStyles: {
          fillColor: [255, 255, 255],
        },
        alternateRowStyles: {
          fillColor: [252, 252, 252],
        },
        columnStyles: {
          0: { cellWidth: 23, halign: 'center' }, // Date
          1: { cellWidth: 44 },                   // Company
          2: { cellWidth: 27, halign: 'center' }, // Invoice #
          3: { cellWidth: 32, halign: 'center' }, // VAT #
          4: { cellWidth: 15, halign: 'center' }, // Currency
          5: { cellWidth: 23, halign: 'right' },  // Subtotal
          6: { cellWidth: 20, halign: 'right' },  // VAT
          7: { cellWidth: 23, halign: 'right' },  // Total
          8: { cellWidth: 20, halign: 'center' }, // Status
          9: { cellWidth: 12, halign: 'center' }, // File
        },
        didParseCell(data) {
          if (data.section === 'body' && data.column.index === 9) {
            const row = rows[data.row.index];
            if (row.fileUrl) {
              data.cell.styles.textColor = [0, 102, 204];
              data.cell.styles.fontStyle = 'bold';
            }
          }

          if (data.section === 'body' && data.column.index === 7) {
            data.cell.styles.fontStyle = 'bold';
          }
        },
        didDrawCell(data) {
          if (data.section === 'body' && data.column.index === 9) {
            const row = rows[data.row.index];

            if (row.fileUrl) {
              doc.link(
                data.cell.x,
                data.cell.y,
                data.cell.width,
                data.cell.height,
                { url: row.fileUrl }
              );
            }
          }
        },
      });

      drawFooter();
      doc.save(`${fileName}.pdf`);
    } catch (error) {
      console.error(error);
      alert('Could not generate PDF report.');
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
      {loading ? 'Generating PDF...' : 'Download PDF'}
    </button>
  );
}
