"use client";

import {
  useMemo,
  useState,
} from "react";

type SubCategory = {
  id: number;
  name: string;
};

type MainCategory = {
  id: number;
  name: string;
  children: SubCategory[];
};

type Props = {
  categories: MainCategory[];
  initialMainCategoryId?: number | null;
  initialCategoryId?: number | null;
};

export default function ProductCategoryFields({
  categories,
  initialMainCategoryId = null,
  initialCategoryId = null,
}: Props) {
  const [
    mainCategoryId,
    setMainCategoryId,
  ] = useState(
    initialMainCategoryId
      ? String(
          initialMainCategoryId,
        )
      : "",
  );

  const [
    categoryId,
    setCategoryId,
  ] = useState(
    initialCategoryId
      ? String(
          initialCategoryId,
        )
      : "",
  );

  const subCategories =
    useMemo(
      () => {
        const selectedMain =
          categories.find(
            (category) =>
              String(
                category.id,
              ) ===
              mainCategoryId,
          );

        return (
          selectedMain?.children ??
          []
        );
      },
      [
        categories,
        mainCategoryId,
      ],
    );

  function handleMainCategoryChange(
    value: string,
  ) {
    setMainCategoryId(
      value,
    );

    setCategoryId("");
  }

  return (
    <>
      <label>
        <span className="mb-2 block text-sm font-semibold">
          Ana Kategori
        </span>

        <select
          value={
            mainCategoryId
          }
          onChange={(
            event,
          ) =>
            handleMainCategoryChange(
              event.target
                .value,
            )
          }
          className="w-full rounded-xl border bg-white p-4"
          required
        >
          <option
            value=""
            disabled
          >
            Ana kategori
            seçiniz
          </option>

          {categories.map(
            (category) => (
              <option
                key={
                  category.id
                }
                value={
                  category.id
                }
              >
                {
                  category.name
                }
              </option>
            ),
          )}
        </select>
      </label>

      <label>
        <span className="mb-2 block text-sm font-semibold">
          Alt Kategori
        </span>

        <select
          name="categoryId"
          value={
            categoryId
          }
          onChange={(
            event,
          ) =>
            setCategoryId(
              event.target
                .value,
            )
          }
          disabled={
            !mainCategoryId
          }
          className="w-full rounded-xl border bg-white p-4 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          required
        >
          <option
            value=""
            disabled
          >
            {mainCategoryId
              ? "Alt kategori seçiniz"
              : "Önce ana kategori seçiniz"}
          </option>

          {subCategories.map(
            (category) => (
              <option
                key={
                  category.id
                }
                value={
                  category.id
                }
              >
                {
                  category.name
                }
              </option>
            ),
          )}
        </select>
      </label>
    </>
  );
}
