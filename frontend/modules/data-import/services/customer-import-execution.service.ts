import "server-only";

import {
  DataImportMode,
  DataImportRowStatus,
  DataImportStatus,
  DataImportType,
} from "@prisma/client";

import {
  prisma,
} from "@/lib/prisma";

import {
  CUSTOMER_IMPORT_TEMPLATE,
} from "@/modules/data-import/constants/customer-import.constants";

import type {
  CustomerAddressImportNormalizedData,
} from "@/modules/data-import/services/customer-address-import-validation.service";

import type {
  CustomerImportNormalizedData,
} from "@/modules/data-import/services/customer-import-validation.service";

function normalizeSheetName(
  value: string
) {
  return value
    .trim()
    .toLocaleLowerCase(
      "tr-TR"
    )
    .replaceAll("ı", "i")
    .replaceAll("ş", "s")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(
      /[^a-z0-9]/g,
      ""
    );
}

function assertCustomerData(
  data:
    CustomerImportNormalizedData
) {
  if (
    !data.customerCode ||
    !data.companyName ||
    data.paymentTermDays ===
      null ||
    data.discountRate ===
      null ||
    data.creditLimit ===
      null ||
    data.isActive ===
      null
  ) {
    throw new Error(
      "Ön izlemedeki müşteri verilerinden biri eksik. Dosyayı yeniden yükleyin."
    );
  }

  return {
    customerCode:
      data.customerCode,

    companyName:
      data.companyName,

    taxOffice:
      data.taxOffice,

    taxNumber:
      data.taxNumber,

    contactName:
      data.contactName,

    phone:
      data.phone,

    email:
      data.email,

    address:
      data.address,

    city:
      data.city,

    district:
      data.district,

    paymentTermDays:
      data.paymentTermDays,

    discountRate:
      data.discountRate,

    creditLimit:
      data.creditLimit,

    isActive:
      data.isActive,
  };
}

function assertAddressData(
  data:
    CustomerAddressImportNormalizedData
) {
  if (
    !data.customerCode ||
    !data.title ||
    !data.addressType ||
    !data.address ||
    !data.city ||
    !data.district ||
    data.hasForklift ===
      null ||
    data.rampCount ===
      null ||
    data.isDefault ===
      null ||
    data.isActive ===
      null
  ) {
    throw new Error(
      "Ön izlemedeki teslimat adresi verilerinden biri eksik. Dosyayı yeniden yükleyin."
    );
  }

  return {
    customerCode:
      data.customerCode,

    title:
      data.title,

    addressType:
      data.addressType,

    contactName:
      data.contactName,

    phone:
      data.phone,

    address:
      data.address,

    city:
      data.city,

    district:
      data.district,

    postalCode:
      data.postalCode,

    deliveryStartTime:
      data.deliveryStartTime,

    deliveryEndTime:
      data.deliveryEndTime,

    hasForklift:
      data.hasForklift,

    rampCount:
      data.rampCount,

    vehicleType:
      data.vehicleType,

    description:
      data.description,

    isDefault:
      data.isDefault,

    isActive:
      data.isActive,
  };
}

function createAddressKey({
  customerId,
  title,
}: {
  customerId: number;
  title: string;
}) {
  return `${customerId}|${title
    .trim()
    .toLocaleUpperCase(
      "tr-TR"
    )}`;
}

export class CustomerImportExecutionService {
  static async execute(
    jobId: string
  ) {
    const normalizedJobId =
      jobId.trim();

    if (!normalizedJobId) {
      throw new Error(
        "Aktarım ön izleme kaydı bulunamadı."
      );
    }

    return prisma.$transaction(
      async (tx) => {
        const job =
          await tx.dataImportJob.findUnique({
            where: {
              id:
                normalizedJobId,
            },

            include: {
              rows: {
                orderBy: [
                  {
                    sheetName:
                      "asc",
                  },
                  {
                    rowNumber:
                      "asc",
                  },
                ],
              },
            },
          });

        if (!job) {
          throw new Error(
            "Aktarım ön izleme kaydı bulunamadı."
          );
        }

        if (
          job.importType !==
          DataImportType.CUSTOMER
        ) {
          throw new Error(
            "Bu kayıt bir müşteri aktarımı değil."
          );
        }

        if (
          job.status !==
          DataImportStatus.READY
        ) {
          throw new Error(
            "Bu aktarım daha önce işlenmiş veya işleme kapatılmış."
          );
        }

        if (
          job.invalidRows >
          0
        ) {
          throw new Error(
            "Hatalı satırlar düzeltilmeden müşteri aktarımı onaylanamaz."
          );
        }

        const validRows =
          job.rows.filter(
            (row) =>
              row.status ===
              DataImportRowStatus.VALID
          );

        if (
          validRows.length ===
          0
        ) {
          throw new Error(
            "Aktarılacak geçerli müşteri satırı bulunamadı."
          );
        }

        const customerSheetName =
          normalizeSheetName(
            CUSTOMER_IMPORT_TEMPLATE
              .customerSheetName
          );

        const addressSheetName =
          normalizeSheetName(
            CUSTOMER_IMPORT_TEMPLATE
              .addressSheetName
          );

        const customerRows =
          validRows
            .filter(
              (row) =>
                normalizeSheetName(
                  row.sheetName
                ) ===
                customerSheetName
            )
            .map(
              (row) => ({
                row,

                data:
                  assertCustomerData(
                    row.normalizedData as unknown as
                      CustomerImportNormalizedData
                  ),
              })
            );

        const addressRows =
          validRows
            .filter(
              (row) =>
                normalizeSheetName(
                  row.sheetName
                ) ===
                addressSheetName
            )
            .map(
              (row) => ({
                row,

                data:
                  assertAddressData(
                    row.normalizedData as unknown as
                      CustomerAddressImportNormalizedData
                  ),
              })
            );

        if (
          customerRows.length ===
          0
        ) {
          throw new Error(
            "Aktarılacak müşteri ana kaydı bulunamadı."
          );
        }

        const customerCodes =
          customerRows.map(
            ({ data }) =>
              data.customerCode
          );

        const taxNumbers =
          customerRows
            .map(
              ({ data }) =>
                data.taxNumber
            )
            .filter(
              (
                taxNumber
              ): taxNumber is string =>
                Boolean(
                  taxNumber
                )
            );

        const existingCustomers =
          await tx.customer.findMany({
            where: {
              OR: [
                {
                  customerCode: {
                    in:
                      customerCodes,
                  },
                },

                ...(taxNumbers.length >
                0
                  ? [
                      {
                        taxNumber: {
                          in:
                            taxNumbers,
                        },
                      },
                    ]
                  : []),
              ],
            },

            select: {
              id: true,
              customerCode:
                true,
              taxNumber:
                true,
            },
          });

        const existingByCode =
          new Map(
            existingCustomers.map(
              (customer) => [
                customer.customerCode,
                customer,
              ]
            )
          );

        const existingByTaxNumber =
          new Map<
            string,
            (typeof existingCustomers)[number]
          >();

        for (
          const customer of
          existingCustomers
        ) {
          if (
            customer.taxNumber
          ) {
            existingByTaxNumber.set(
              customer.taxNumber,
              customer
            );
          }
        }

        for (
          const {
            data,
          } of customerRows
        ) {
          if (
            !data.taxNumber
          ) {
            continue;
          }

          const taxNumberOwner =
            existingByTaxNumber.get(
              data.taxNumber
            );

          if (
            taxNumberOwner &&
            taxNumberOwner.customerCode !==
              data.customerCode
          ) {
            throw new Error(
              `${data.taxNumber} vergi numarası ` +
                `${taxNumberOwner.customerCode} müşterisinde kullanılıyor.`
            );
          }
        }

        await tx.dataImportJob.update({
          where: {
            id:
              job.id,
          },

          data: {
            status:
              DataImportStatus.PROCESSING,

            startedAt:
              new Date(),

            errorMessage:
              null,
          },
        });

        let insertedRows =
          0;

        let updatedRows =
          0;

        let skippedRows =
          0;

        let insertedCustomers =
          0;

        let updatedCustomers =
          0;

        let skippedCustomers =
          0;

        let insertedAddresses =
          0;

        let updatedAddresses =
          0;

        let skippedAddresses =
          0;

        const customerIdByCode =
          new Map<
            string,
            number
          >();

        const skippedCustomerCodes =
          new Set<string>();

        for (
          const {
            row,
            data,
          } of customerRows
        ) {
          const existing =
            existingByCode.get(
              data.customerCode
            );

          if (
            existing &&
            job.mode ===
              DataImportMode.CREATE_ONLY
          ) {
            customerIdByCode.set(
              data.customerCode,
              existing.id
            );

            skippedCustomerCodes.add(
              data.customerCode
            );

            await tx.dataImportRow.update({
              where: {
                id:
                  row.id,
              },

              data: {
                status:
                  DataImportRowStatus.SKIPPED,

                resultRecordId:
                  String(
                    existing.id
                  ),

                errors: [
                  "Müşteri kodu zaten kayıtlı olduğu için atlandı.",
                ],
              },
            });

            skippedRows +=
              1;

            skippedCustomers +=
              1;

            continue;
          }

          if (existing) {
            const customer =
              await tx.customer.update({
                where: {
                  id:
                    existing.id,
                },

                data: {
                  companyName:
                    data.companyName,

                  taxOffice:
                    data.taxOffice,

                  taxNumber:
                    data.taxNumber,

                  contactName:
                    data.contactName,

                  phone:
                    data.phone,

                  email:
                    data.email,

                  address:
                    data.address,

                  city:
                    data.city,

                  district:
                    data.district,

                  paymentTermDays:
                    data.paymentTermDays,

                  discountRate:
                    data.discountRate,

                  creditLimit:
                    data.creditLimit,

                  isActive:
                    data.isActive,
                },

                select: {
                  id: true,
                },
              });

            customerIdByCode.set(
              data.customerCode,
              customer.id
            );

            await tx.dataImportRow.update({
              where: {
                id:
                  row.id,
              },

              data: {
                status:
                  DataImportRowStatus.UPDATED,

                resultRecordId:
                  String(
                    customer.id
                  ),

                errors: [],
              },
            });

            updatedRows +=
              1;

            updatedCustomers +=
              1;

            continue;
          }

          const customer =
            await tx.customer.create({
              data: {
                customerCode:
                  data.customerCode,

                companyName:
                  data.companyName,

                taxOffice:
                  data.taxOffice,

                taxNumber:
                  data.taxNumber,

                contactName:
                  data.contactName,

                phone:
                  data.phone,

                email:
                  data.email,

                address:
                  data.address,

                city:
                  data.city,

                district:
                  data.district,

                paymentTermDays:
                  data.paymentTermDays,

                discountRate:
                  data.discountRate,

                creditLimit:
                  data.creditLimit,

                isActive:
                  data.isActive,
              },

              select: {
                id: true,
              },
            });

          customerIdByCode.set(
            data.customerCode,
            customer.id
          );

          await tx.dataImportRow.update({
            where: {
              id:
                row.id,
            },

            data: {
              status:
                DataImportRowStatus.IMPORTED,

              resultRecordId:
                String(
                  customer.id
                ),

              errors: [],
            },
          });

          insertedRows +=
            1;

          insertedCustomers +=
            1;
        }

        const customerIds =
          Array.from(
            new Set(
              customerIdByCode.values()
            )
          );

        const existingAddresses =
          customerIds.length >
          0
            ? await tx.customerAddress.findMany({
                where: {
                  customerId: {
                    in:
                      customerIds,
                  },
                },

                select: {
                  id: true,
                  customerId:
                    true,
                  title: true,
                },
              })
            : [];

        const existingAddressMap =
          new Map(
            existingAddresses.map(
              (address) => [
                createAddressKey({
                  customerId:
                    address.customerId,

                  title:
                    address.title,
                }),

                address,
              ]
            )
          );

        for (
          const {
            row,
            data,
          } of addressRows
        ) {
          const customerId =
            customerIdByCode.get(
              data.customerCode
            );

          if (!customerId) {
            throw new Error(
              `${data.customerCode} müşteri kaydı adres aktarımı için bulunamadı.`
            );
          }

          const addressKey =
            createAddressKey({
              customerId,

              title:
                data.title,
            });

          const existingAddress =
            existingAddressMap.get(
              addressKey
            );

          if (
            skippedCustomerCodes.has(
              data.customerCode
            ) ||
            (
              existingAddress &&
              job.mode ===
                DataImportMode.CREATE_ONLY
            )
          ) {
            await tx.dataImportRow.update({
              where: {
                id:
                  row.id,
              },

              data: {
                status:
                  DataImportRowStatus.SKIPPED,

                resultRecordId:
                  existingAddress
                    ? String(
                        existingAddress.id
                      )
                    : null,

                errors: [
                  "Müşteri zaten kayıtlı olduğu için teslimat adresi atlandı.",
                ],
              },
            });

            skippedRows +=
              1;

            skippedAddresses +=
              1;

            continue;
          }

          if (
            data.isDefault
          ) {
            await tx.customerAddress.updateMany({
              where: {
                customerId,

                ...(existingAddress
                  ? {
                      id: {
                        not:
                          existingAddress.id,
                      },
                    }
                  : {}),
              },

              data: {
                isDefault:
                  false,
              },
            });
          }

          if (
            existingAddress
          ) {
            const address =
              await tx.customerAddress.update({
                where: {
                  id:
                    existingAddress.id,
                },

                data: {
                  title:
                    data.title,

                  addressType:
                    data.addressType,

                  contactName:
                    data.contactName,

                  phone:
                    data.phone,

                  address:
                    data.address,

                  city:
                    data.city,

                  district:
                    data.district,

                  postalCode:
                    data.postalCode,

                  deliveryStartTime:
                    data.deliveryStartTime,

                  deliveryEndTime:
                    data.deliveryEndTime,

                  hasForklift:
                    data.hasForklift,

                  rampCount:
                    data.rampCount,

                  vehicleType:
                    data.vehicleType,

                  description:
                    data.description,

                  isDefault:
                    data.isDefault,

                  isActive:
                    data.isActive,
                },

                select: {
                  id: true,
                },
              });

            await tx.dataImportRow.update({
              where: {
                id:
                  row.id,
              },

              data: {
                status:
                  DataImportRowStatus.UPDATED,

                resultRecordId:
                  String(
                    address.id
                  ),

                errors: [],
              },
            });

            updatedRows +=
              1;

            updatedAddresses +=
              1;

            continue;
          }

          const address =
            await tx.customerAddress.create({
              data: {
                customerId,

                title:
                  data.title,

                addressType:
                  data.addressType,

                contactName:
                  data.contactName,

                phone:
                  data.phone,

                address:
                  data.address,

                city:
                  data.city,

                district:
                  data.district,

                postalCode:
                  data.postalCode,

                deliveryStartTime:
                  data.deliveryStartTime,

                deliveryEndTime:
                  data.deliveryEndTime,

                hasForklift:
                  data.hasForklift,

                rampCount:
                  data.rampCount,

                vehicleType:
                  data.vehicleType,

                description:
                  data.description,

                isDefault:
                  data.isDefault,

                isActive:
                  data.isActive,
              },

              select: {
                id: true,
                title: true,
              },
            });

          existingAddressMap.set(
            addressKey,
            {
              id:
                address.id,

              customerId,

              title:
                address.title,
            }
          );

          await tx.dataImportRow.update({
            where: {
              id:
                row.id,
            },

            data: {
              status:
                DataImportRowStatus.IMPORTED,

              resultRecordId:
                String(
                  address.id
                ),

              errors: [],
            },
          });

          insertedRows +=
            1;

          insertedAddresses +=
            1;
        }

        return tx.dataImportJob.update({
          where: {
            id:
              job.id,
          },

          data: {
            status:
              DataImportStatus.COMPLETED,

            insertedRows,
            updatedRows,
            skippedRows,

            failedRows:
              0,

            finishedAt:
              new Date(),

            summary: {
              insertedRows,
              updatedRows,
              skippedRows,

              customers: {
                inserted:
                  insertedCustomers,

                updated:
                  updatedCustomers,

                skipped:
                  skippedCustomers,
              },

              addresses: {
                inserted:
                  insertedAddresses,

                updated:
                  updatedAddresses,

                skipped:
                  skippedAddresses,
              },
            },
          },

          select: {
            id: true,
            importNumber:
              true,
            status: true,
            insertedRows:
              true,
            updatedRows:
              true,
            skippedRows:
              true,
          },
        });
      },
      {
        maxWait:
          10000,

        timeout:
          120000,
      }
    );
  }
}