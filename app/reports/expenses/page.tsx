import {
  AccountingReportPage,
} from '../../components/AccountingReportPage';

type Props = {
  searchParams: Promise<
    Record<
      string,
      string |
      string[] |
      undefined
    >
  >;
};

export default async function
ExpenseReportsPage({
  searchParams,
}: Props) {
  const params =
    await searchParams;

  return (
    <AccountingReportPage
      kind="expenses"
      searchParams={params}
    />
  );
}
