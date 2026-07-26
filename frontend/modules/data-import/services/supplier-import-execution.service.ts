import "server-only";

import {
  DataImportMode,
  DataImportRowStatus,
  DataImportStatus,
  DataImportType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import type {
  SupplierImportNormalizedData,
} from "@/modules/data-import/services/supplier-import-validation.service";

function assertSupplierData(
  data: SupplierImportNormalizedData
) {
  if (
    !data.name ||
    data.paymentTermDays === null ||
    data.discountRate === null ||
    data.deliveryDays === null ||
    data.isActive === null
  ) {
    throw new Error(
      "Ön izlemedeki tedarikçi verilerinden biri eksik. Dosyayı yeniden yükleyin."
    );
  }

  return {
    name: data.name,
    taxOffice: data.taxOffice,
    taxNumber: data.taxNumber,
    contactName: data.contactName,
    phone: data.phone,
    email: data.email,
    address: data.address,
    city: data.city,
    district: data.district,
    postalCode: data.postalCode,
    paymentTermDays:
      data.paymentTermDays,
    discountRate:
      data.discountRate,
    deliveryDays:
      data.deliveryDays,
    isActive:
      data.isActive,
  };
}

export class SupplierImportExecutionService {
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
              id: normalizedJobId,
            },

            include: {
              rows: {
                orderBy: {
                  rowNumber: "asc",
                },
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
          DataImportType.SUPPLIER
        ) {
          throw new Error(
            "Bu kayıt bir tedarikçi aktarımı değil."
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
          job.invalidRows > 0
        ) {
          throw new Error(
            "Hatalı satırlar düzeltilmeden tedarikçi aktarımı onaylanamaz."
          );
        }

        const validRows =
          job.rows.filter(
            (row) =>
              row.status ===
              DataImportRowStatus.VALID
          );

        if (
          validRows.length === 0
        ) {
          throw new Error(
            "Aktarılacak geçerli tedarikçi satırı bulunamadı."
          );
        }

        const preparedRows =
          validRows.map(
            (row) => ({
              row,

              data:
                assertSupplierData(
                  row.normalizedData as unknown as
                    SupplierImportNormalizedData
                ),
            })
          );

        const supplierNames =
          preparedRows.map(
            ({ data }) =>
              data.name
          );

        const taxNumbers =
          preparedRows
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

        const existingSuppliers =
          await tx.supplier.findMany({
            where: {
              OR: [
                {
                  name: {
                    in:
                      supplierNames,
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
              name: true,
              taxNumber: true,
            },
          });

        const existingByName =
          new Map(
            existingSuppliers.map(
              (supplier) => [
                supplier.name,
                supplier,
              ]
            )
          );

        const existingByTaxNumber =
          new Map(
            existingSuppliers
              .filter(
                (
                  supplier
                ): supplier is typeof supplier & {
                  taxNumber: string;
                } =>
                  Boolean(
                    supplier.taxNumber
                  )
              )
              .map(
                (supplier) => [
                  supplier.taxNumber,
                  supplier,
                ]
              )
          );

        /*
         * Vergi numarası başka bir
         * tedarikçide kullanılıyorsa
         * aktarımın tamamı durdurulur.
         */
        for (
          const {
            data,
          } of preparedRows
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

          const supplierByName =
            existingByName.get(
              data.name
            );

          if (
            taxNumberOwner &&
            taxNumberOwner.id !==
              supplierByName?.id
          ) {
            throw new Error(
              `${data.taxNumber} vergi numarası ` +
                `${taxNumberOwner.name} tedarikçisinde kullanılıyor.`
            );
          }
        }

        await tx.dataImportJob.update({
          where: {
            id: job.id,
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

        let insertedRows = 0;
        let updatedRows = 0;
        let skippedRows = 0;

        for (
          const {
            row,
            data,
          } of preparedRows
        ) {
          const existing =
            existingByName.get(
              data.name
            );

          if (
            existing &&
            job.mode ===
              DataImportMode.CREATE_ONLY
          ) {
            await tx.dataImportRow.update({
              where: {
                id: row.id,
              },

              data: {
                status:
                  DataImportRowStatus.SKIPPED,

                resultRecordId:
                  String(
                    existing.id
                  ),

                errors: [
                  "Tedarikçi zaten kayıtlı olduğu için atlandı.",
                ],
              },
            });

            skippedRows += 1;
            continue;
          }

          if (existing) {
            const supplier =
              await tx.supplier.update({
                where: {
                  id:
                    existing.id,
                },

                data: {
                  name:
                    data.name,

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

                  postalCode:
                    data.postalCode,

                  paymentTermDays:
                    data.paymentTermDays,

                  discountRate:
                    data.discountRate,

                  deliveryDays:
                    data.deliveryDays,

                  isActive:
                    data.isActive,
                },

                select: {
                  id: true,
                },
              });

            await tx.dataImportRow.update({
              where: {
                id: row.id,
              },

              data: {
                status:
                  DataImportRowStatus.UPDATED,

                resultRecordId:
                  String(
                    supplier.id
                  ),

                errors: [],
              },
            });

            updatedRows += 1;
            continue;
          }

          const supplier =
            await tx.supplier.create({
              data: {
                name:
                  data.name,

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

                postalCode:
                  data.postalCode,

                paymentTermDays:
                  data.paymentTermDays,

                discountRate:
                  data.discountRate,

                deliveryDays:
                  data.deliveryDays,

                isActive:
                  data.isActive,
              },

              select: {
                id: true,
              },
            });

          await tx.dataImportRow.update({
            where: {
              id: row.id,
            },

            data: {
              status:
                DataImportRowStatus.IMPORTED,

              resultRecordId:
                String(
                  supplier.id
                ),

              errors: [],
            },
          });

          insertedRows += 1;
        }

        return tx.dataImportJob.update({
          where: {
            id: job.id,
          },

          data: {
            status:
              DataImportStatus.COMPLETED,

            insertedRows,
            updatedRows,
            skippedRows,
            failedRows: 0,

            finishedAt:
              new Date(),

            summary: {
              insertedRows,
              updatedRows,
              skippedRows,
            },
          },

          select: {
            id: true,
            importNumber: true,
            status: true,
            insertedRows: true,
            updatedRows: true,
            skippedRows: true,
          },
        });
      },
      {
        maxWait: 10000,
        timeout: 60000,
      }
    );
  }
}