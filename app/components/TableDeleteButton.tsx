'use client';

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  label?: string;
  confirmMessage?: string;
};

export function TableDeleteButton({
  action,
  label = 'Delete',
  confirmMessage = 'Are you sure you want to delete this invoice? This action cannot be undone.',
}: Props) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        const confirmed = window.confirm(confirmMessage);

        if (!confirmed) {
          event.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        style={{
          background: '#b42318',
          border: '1px solid #b42318',
          color: '#fff',
          borderRadius: 7,
          padding: '7px 10px',
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 600,
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </button>
    </form>
  );
}
