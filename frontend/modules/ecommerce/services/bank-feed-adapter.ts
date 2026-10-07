import "server-only";

import { BankReconciliationService, type BankTransactionImport } from "./bank-reconciliation.service";

export type BankFeedAdapter = {
  provider: string;
  fetchTransactions(input: {
    bankAccountId: number;
    from: Date;
    to: Date;
  }): Promise<BankTransactionImport[]>;
};

export class BankFeedSyncService {
  static async sync(adapter: BankFeedAdapter, input: { bankAccountId: number; from: Date; to: Date }) {
    const rows = await adapter.fetchTransactions(input);
    return BankReconciliationService.importTransactions(rows);
  }
}
