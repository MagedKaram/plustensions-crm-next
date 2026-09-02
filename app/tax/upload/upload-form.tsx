'use client';

import {
  FormEvent,
  useState,
} from 'react';

type InvoiceRoute =
  | 'current'
  | 'bank';

export function UploadForm() {
  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  const [
    fileName,
    setFileName,
  ] = useState('');

  const [
    fileSize,
    setFileSize,
  ] = useState('');

  const [
    route,
    setRoute,
  ] = useState<
    InvoiceRoute | ''
  >('');

  function formatFileSize(
    bytes: number,
  ) {
    if (!bytes) return '';

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (
      bytes <
      1024 * 1024
    ) {
      return `${(
        bytes / 1024
      ).toFixed(1)} KB`;
    }

    return `${(
      bytes /
      (1024 * 1024)
    ).toFixed(1)} MB`;
  }

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const form =
      event.currentTarget;

    const data =
      new FormData(form);

    const file =
      data.get(
        'invoice',
      ) as File;

    if (!file?.name) {
      setMessage({
        ok: false,
        text: 'Choose a PDF or image first.',
      });

      return;
    }

    if (!route) {
      setMessage({
        ok: false,
        text: 'Choose whether this is a Goods Invoice or Expense Invoice.',
      });

      return;
    }

    data.set(
      'route',
      route,
    );

    setLoading(true);
    setMessage(null);

    try {
      const res =
        await fetch(
          '/api/tax/upload',
          {
            method: 'POST',
            body: data,
            credentials:
              'include',
          },
        );

      const json =
        await res.json();

      if (!res.ok) {
        throw new Error(
          json.error ||
            'Upload failed',
        );
      }

      const typeName =
        route === 'current'
          ? 'Goods Invoice'
          : 'Expense Invoice';

      setMessage({
        ok: true,
        text: `${typeName} sent to the processing workflow successfully.`,
      });

      form.reset();

      setFileName('');
      setFileSize('');
      setRoute('');
    } catch (err) {
      setMessage({
        ok: false,

        text:
          err instanceof Error
            ? err.message
            : 'Upload failed',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={submit}
    >
      {message ? (
        <div
          className={
            message.ok
              ? 'flash'
              : 'login-error'
          }
          style={{
            marginBottom: 18,
          }}
        >
          {message.text}
        </div>
      ) : null}

      <div
        style={{
          marginBottom: 20,
        }}
      >
        <div
          className="strong"
          style={{
            marginBottom: 10,
          }}
        >
          Invoice type
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
          }}
        >
          <label
            style={{
              border:
                route ===
                'current'
                  ? '2px solid #2563eb'
                  : '1px solid #d0d5dd',

              borderRadius: 10,

              padding: 16,

              cursor:
                'pointer',

              background:
                route ===
                'current'
                  ? '#eff6ff'
                  : '#fff',
            }}
          >
            <input
              type="radio"
              name="invoice_type"
              value="current"
              checked={
                route ===
                'current'
              }
              onChange={() =>
                setRoute(
                  'current',
                )
              }
              style={{
                marginRight: 8,
              }}
            />

            <span className="strong">
              Goods Invoice
            </span>

            <div
              className="muted"
              style={{
                marginTop: 7,
                marginLeft: 22,
                fontSize: 13,
              }}
            >
              Goods, products,
              stock, and supplier
              purchases.
            </div>
          </label>

          <label
            style={{
              border:
                route ===
                'bank'
                  ? '2px solid #2563eb'
                  : '1px solid #d0d5dd',

              borderRadius: 10,

              padding: 16,

              cursor:
                'pointer',

              background:
                route ===
                'bank'
                  ? '#eff6ff'
                  : '#fff',
            }}
          >
            <input
              type="radio"
              name="invoice_type"
              value="bank"
              checked={
                route ===
                'bank'
              }
              onChange={() =>
                setRoute(
                  'bank',
                )
              }
              style={{
                marginRight: 8,
              }}
            />

            <span className="strong">
              Expense Invoice
            </span>

            <div
              className="muted"
              style={{
                marginTop: 7,
                marginLeft: 22,
                fontSize: 13,
              }}
            >
              Services,
              operational
              expenses, bills,
              and other costs.
            </div>
          </label>
        </div>
      </div>

      <label
        className="dropzone"
        htmlFor="invoice-file"
      >
        <svg
          className="dz-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 16V4M7 9l5-5 5 5" />

          <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>

        <div className="strong">
          {fileName ||
            'Drop an invoice here or click to browse'}
        </div>

        {fileSize ? (
          <div
            className="muted"
            style={{
              marginTop: 4,
            }}
          >
            {fileSize}
          </div>
        ) : (
          <div className="muted">
            Accepted: PDF, PNG, JPG
          </div>
        )}

        <input
          id="invoice-file"
          type="file"
          name="invoice"
          accept=".pdf,image/png,image/jpeg"
          required
          onChange={(e) => {
            const file =
              e.target.files?.[0];

            setFileName(
              file?.name || '',
            );

            setFileSize(
              file
                ? formatFileSize(
                    file.size,
                  )
                : '',
            );
          }}
        />
      </label>

      <div
        className="field"
        style={{
          marginTop: 18,
        }}
      >
        <label htmlFor="notes">
          Notes (optional)
        </label>

        <input
          id="notes"
          type="text"
          name="notes"
          placeholder="Anything the reviewer or workflow should know"
        />
      </div>

      <button
        className="btn"
        type="submit"
        disabled={
          loading ||
          !route
        }
        style={{
          marginTop: 4,
          minWidth: 160,
        }}
      >
        {loading
          ? 'Processing…'
          : 'Process Invoice'}
      </button>
    </form>
  );
}
