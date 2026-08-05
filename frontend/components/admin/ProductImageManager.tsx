"use client";

import {
  useActionState,
  useMemo,
  useRef,
  useState,
} from "react";
import { useFormStatus } from "react-dom";

import {
  uploadProductImages,
} from "@/app/admin/product-images/actions";

import {
  INITIAL_PRODUCT_IMAGE_UPLOAD_STATE,
} from "@/modules/products/images/product-image.types";

type SelectedFile = {
  file: File;
  sku: string;
  previewUrl: string;
};

const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

function normalizeSku(
  filename: string,
): string {
  return filename
    .trim()
    .replace(
      /(?:\.(?:jpe?g|png|webp))+$/gi,
      "",
    )
    .trim()
    .toLocaleUpperCase("tr-TR");
}

function UploadButton({
  disabled,
}: {
  disabled: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={
        disabled ||
        pending
      }
      className="rounded-xl bg-blue-700 px-6 py-3 font-bold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-400"
    >
      {pending
        ? "Görseller yükleniyor..."
        : "Görselleri Yükle"}
    </button>
  );
}

export default function ProductImageManager() {
  const inputRef =
    useRef<HTMLInputElement>(null);

  const [
    selectedFiles,
    setSelectedFiles,
  ] = useState<SelectedFile[]>([]);

  const [isDragging, setIsDragging] =
    useState(false);

  const [state, formAction] =
    useActionState(
      uploadProductImages,
      INITIAL_PRODUCT_IMAGE_UPLOAD_STATE,
    );

  const duplicateSkus = useMemo(() => {
    const skuCounts = new Map<
      string,
      number
    >();

    for (const item of selectedFiles) {
      skuCounts.set(
        item.sku,
        (skuCounts.get(item.sku) ?? 0) +
          1,
      );
    }

    return new Set(
      Array.from(skuCounts.entries())
        .filter(
          ([, count]) =>
            count > 1,
        )
        .map(([sku]) => sku),
    );
  }, [selectedFiles]);

  function revokePreviews(
    items: SelectedFile[],
  ) {
    for (const item of items) {
      URL.revokeObjectURL(
        item.previewUrl,
      );
    }
  }

  function setFiles(
    fileList: FileList | File[],
  ) {
    const imageFiles = Array.from(
      fileList,
    ).filter((file) =>
      ACCEPTED_IMAGE_TYPES.includes(
        file.type,
      ),
    );

    revokePreviews(selectedFiles);

    const nextFiles =
      imageFiles.map((file) => ({
        file,
        sku: normalizeSku(
          file.name,
        ),
        previewUrl:
          URL.createObjectURL(file),
      }));

    setSelectedFiles(nextFiles);
  }

  function removeFile(
    fileName: string,
  ) {
    setSelectedFiles(
      (currentFiles) => {
        const removed =
          currentFiles.find(
            (item) =>
              item.file.name ===
              fileName,
          );

        if (removed) {
          URL.revokeObjectURL(
            removed.previewUrl,
          );
        }

        return currentFiles.filter(
          (item) =>
            item.file.name !==
            fileName,
        );
      },
    );
  }

  function clearFiles() {
    revokePreviews(selectedFiles);
    setSelectedFiles([]);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-6">
      <form
        action={formAction}
        className="space-y-6"
      >
        <div
          role="button"
          tabIndex={0}
          onClick={() =>
            inputRef.current?.click()
          }
          onKeyDown={(event) => {
            if (
              event.key === "Enter" ||
              event.key === " "
            ) {
              inputRef.current?.click();
            }
          }}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();

            if (
              event.currentTarget ===
              event.target
            ) {
              setIsDragging(false);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);

            setFiles(
              event.dataTransfer.files,
            );
          }}
          className={`cursor-pointer rounded-2xl border-2 border-dashed bg-white p-10 text-center transition ${
            isDragging
              ? "border-blue-600 bg-blue-50"
              : "border-slate-300 hover:border-blue-500"
          }`}
        >
          <input
            ref={inputRef}
            name="productImages"
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => {
              if (
                event.target.files
              ) {
                setFiles(
                  event.target.files,
                );
              }
            }}
          />

          <div className="text-5xl">
            🖼️
          </div>

          <p className="mt-4 text-lg font-bold text-slate-900">
            Görselleri buraya bırak
          </p>

          <p className="mt-2 text-sm text-slate-500">
            veya tıklayarak JPG, PNG
            ya da WEBP dosyalarını seç
          </p>

          <p className="mt-3 text-xs text-slate-400">
            Dosya adı ürün SKU’su
            olmalıdır. Örnek:
            ETK-KAG-0001.jpg
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-xl border bg-white p-5">
            <p className="text-sm text-slate-500">
              Seçilen dosya
            </p>

            <p className="mt-2 text-3xl font-black">
              {selectedFiles.length}
            </p>
          </article>

          <article className="rounded-xl border bg-white p-5">
            <p className="text-sm text-slate-500">
              Tekil SKU
            </p>

            <p className="mt-2 text-3xl font-black text-blue-700">
              {
                new Set(
                  selectedFiles.map(
                    (item) =>
                      item.sku,
                  ),
                ).size
              }
            </p>
          </article>

          <article className="rounded-xl border bg-white p-5">
            <p className="text-sm text-slate-500">
              Mükerrer SKU
            </p>

            <p className="mt-2 text-3xl font-black text-red-700">
              {duplicateSkus.size}
            </p>
          </article>

          <article className="rounded-xl border bg-white p-5">
            <p className="text-sm text-slate-500">
              Maksimum
            </p>

            <p className="mt-2 text-3xl font-black text-slate-700">
              100
            </p>
          </article>
        </div>

        <section className="overflow-hidden rounded-xl border bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
            <h2 className="font-bold">
              Seçilen Görseller
            </h2>

            {selectedFiles.length >
              0 && (
              <button
                type="button"
                onClick={clearFiles}
                className="text-sm font-bold text-red-600 hover:text-red-700"
              >
                Tümünü Temizle
              </button>
            )}
          </div>

          {selectedFiles.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
              Henüz görsel
              seçilmedi.
            </div>
          ) : (
            <div className="max-h-[520px] divide-y overflow-y-auto">
              {selectedFiles.map(
                (item) => {
                  const isDuplicate =
                    duplicateSkus.has(
                      item.sku,
                    );

                  return (
                    <div
                      key={
                        item.file.name
                      }
                      className="flex items-center gap-4 p-4"
                    >
                      <img
                        src={
                          item.previewUrl
                        }
                        alt=""
                        className="h-16 w-16 rounded-lg border bg-white object-contain p-1"
                      />

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-slate-900">
                          {item.sku}
                        </p>

                        <p className="mt-1 truncate text-xs text-slate-500">
                          {
                            item.file
                              .name
                          }
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {(
                            item.file
                              .size /
                            1024
                          ).toLocaleString(
                            "tr-TR",
                            {
                              maximumFractionDigits: 1,
                            },
                          )}{" "}
                          KB
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          isDuplicate
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {isDuplicate
                          ? "Mükerrer"
                          : "Hazır"}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          removeFile(
                            item.file
                              .name,
                          )
                        }
                        className="rounded-lg px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50"
                      >
                        Kaldır
                      </button>
                    </div>
                  );
                },
              )}
            </div>
          )}
        </section>

        <div className="flex flex-wrap items-center gap-4">
          <UploadButton
            disabled={
              selectedFiles.length ===
                0 ||
              selectedFiles.length >
                100 ||
              duplicateSkus.size > 0
            }
          />

          {duplicateSkus.size > 0 && (
            <p className="text-sm font-semibold text-red-600">
              Yükleme öncesinde
              mükerrer SKU dosyalarını
              kaldırın.
            </p>
          )}
        </div>
      </form>

      {state.message && (
        <section
          className={`rounded-2xl border p-6 ${
            state.status === "success"
              ? "border-green-200 bg-green-50"
              : state.status ===
                  "partial"
                ? "border-amber-200 bg-amber-50"
                : "border-red-200 bg-red-50"
          }`}
        >
          <h2 className="text-xl font-black">
            {state.message}
          </h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <ResultCard
              label="Toplam"
              value={state.totalFiles}
            />

            <ResultCard
              label="Yüklendi"
              value={
                state.uploadedCount
              }
            />

            <ResultCard
              label="Ürün bulunamadı"
              value={
                state.notFoundCount
              }
            />

            <ResultCard
              label="Geçersiz"
              value={
                state.invalidCount
              }
            />

            <ResultCard
              label="Hata"
              value={
                state.failedCount
              }
            />
          </div>

          {state.items.length > 0 && (
            <div className="mt-6 overflow-x-auto rounded-xl bg-white">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th className="p-3">
                      SKU
                    </th>

                    <th className="p-3">
                      Dosya
                    </th>

                    <th className="p-3">
                      Durum
                    </th>

                    <th className="p-3">
                      Açıklama
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {state.items.map(
                    (item, index) => (
                      <tr
                        key={`${item.fileName}-${index}`}
                        className="border-b"
                      >
                        <td className="p-3 font-bold">
                          {item.sku ||
                            "-"}
                        </td>

                        <td className="p-3">
                          {
                            item.fileName
                          }
                        </td>

                        <td className="p-3">
                          {
                            item.status
                          }
                        </td>

                        <td className="p-3">
                          {
                            item.message
                          }
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function ResultCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <article className="rounded-xl bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-3xl font-black text-slate-900">
        {value}
      </p>
    </article>
  );
}