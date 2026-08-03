# B2B Automated Tests

This test suite protects the business rules that can cause financial,
inventory, or authorization inconsistencies.

## Covered scenarios

- stock availability, reservation, release, shipment, and invalid balances;
- customer account debit, credit, balance, and payment due date calculations;
- customer administrator, buyer, and address-user access boundaries;
- checkout validation, pricing, discount, VAT, stock, address, and credit limit;
- order approval, shipment, cancellation, ledger reversal, and invalid status
  transitions.

All Prisma and Next.js boundaries are mocked. These tests do not connect to or
modify development or production databases.

## Commands

```bash
npm run test:run
npm run test:coverage
npm run lint:tests
npm run quality
```

Coverage checks fail when statements or lines drop below 80%, branches drop
below 70%, or functions drop below 95% for the protected business modules.

The repository-wide `npm run lint` command currently reports pre-existing
application lint debt. CI therefore lints the new test infrastructure with
`npm run lint:tests`; application lint cleanup should be handled separately.
