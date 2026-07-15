"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  placeStockToLocation,
  type LocationStockPlacementState,
} from "@/app/admin/stock/locations/actions";

type ProductOption = {
  id: number;
  code: string;
  name: string;
  physicalStock: number;
  allocatedStock: number;
  unallocatedStock: number;
};

type WarehouseOption = {
  id: number;
  code: string;
  name: string;
};

type LocationOption = {
  id: number;
  warehouseId: number;
  fullCode: string;
  locationType: string;
};

type Props = {
  products: ProductOption[];
  warehouses: WarehouseOption[];
  locations: LocationOption[];
};

const initialState:
  LocationStockPlacementState = {
  success: false,
  message: "",
};

export default function LocationStockPlacementForm({
  products,
  warehouses,
  locations,
}: Props) {
  const formRef =
    useRef<HTMLFormElement>(null);

  const [productId, setProductId] =
    useState("");

  const [
    warehouseId,
    setWarehouseId,
  ] = useState("");

  const [locationId, setLocationId] =
    useState("");

  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    placeStockToLocation,
    initialState
  );

  const selectedProduct =
    useMemo(
      () =>
        products.find(
          (product) =>
            product.id ===
            Number(productId)
        ),
      [products, productId]
    );

  const filteredLocations =
    useMemo(
      () =>
        locations.filter(
          (location) =>
            location.warehouseId ===
            Number(warehouseId)
        ),
      [locations, warehouseId]
    );

  useEffect(() => {
    setLocationId("");
  }, [warehouseId]);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();

      setProductId("");
      setWarehouseId("");
      setLocationId("");
    }
  }, [state.success, state.message]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-2xl bg-white p-6 shadow"
    >
      <h2 className="text-2xl font-bold">
        Lokasyona Stok Yerleştir
      </h2>

      <p className="mt-2 text-sm leading-6 text-gray-500">
        Ürünün mevcut fiziksel stoğunu
        depo lokasyonlarına dağıtın.
      </p>

      {state.message && (
        <div
          role="alert"
          className={`mt-6 rounded-xl border p-5 ${
            state.success
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <p className="font-bold">
            {state.success
              ? "İşlem başarılı"
              : "İşlem gerçekleştirilemedi"}
          </p>

          <p className="mt-2 leading-6">
            {state.message}
          </p>
        </div>
      )}

      <div className="mt-6 space-y-5">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">
            Ürün
          </span>

          <select
            name="productId"
            value={productId}
            onChange={(event) =>
              setProductId(
                event.target.value
              )
            }
            className="w-full rounded-xl border bg-white p-4"
            required
          >
            <option value="">
              Ürün seçin
            </option>

            {products.map((product) => (
              <option
                key={product.id}
                value={product.id}
              >
                {product.code} —{" "}
                {product.name} | Boşta:{" "}
                {product.unallocatedStock}
              </option>
            ))}
          </select>
        </label>

        {selectedProduct && (
          <div className="grid gap-4 rounded-xl bg-blue-50 p-5 md:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase text-blue-700">
                Fiziksel stok
              </p>

              <p className="mt-2 text-2xl font-bold text-blue-900">
                {
                  selectedProduct.physicalStock
                }
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase text-blue-700">
                Yerleştirilen
              </p>

              <p className="mt-2 text-2xl font-bold text-violet-700">
                {
                  selectedProduct.allocatedStock
                }
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase text-blue-700">
                Yerleştirilmemiş
              </p>

              <p className="mt-2 text-2xl font-bold text-green-700">
                {
                  selectedProduct.unallocatedStock
                }
              </p>
            </div>
          </div>
        )}

        <label className="block">
          <span className="mb-2 block text-sm font-semibold">
            Depo
          </span>

          <select
            name="warehouseId"
            value={warehouseId}
            onChange={(event) =>
              setWarehouseId(
                event.target.value
              )
            }
            className="w-full rounded-xl border bg-white p-4"
            required
          >
            <option value="">
              Depo seçin
            </option>

            {warehouses.map(
              (warehouse) => (
                <option
                  key={warehouse.id}
                  value={warehouse.id}
                >
                  {warehouse.code} —{" "}
                  {warehouse.name}
                </option>
              )
            )}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold">
            Lokasyon
          </span>

          <select
            name="locationId"
            value={locationId}
            onChange={(event) =>
              setLocationId(
                event.target.value
              )
            }
            disabled={!warehouseId}
            className="w-full rounded-xl border bg-white p-4 disabled:cursor-not-allowed disabled:bg-slate-100"
            required
          >
            <option value="">
              {warehouseId
                ? "Lokasyon seçin"
                : "Önce depo seçin"}
            </option>

            {filteredLocations.map(
              (location) => (
                <option
                  key={location.id}
                  value={location.id}
                >
                  {location.fullCode} —{" "}
                  {location.locationType}
                </option>
              )
            )}
          </select>

          {warehouseId &&
            filteredLocations.length ===
              0 && (
              <p className="mt-2 text-sm font-semibold text-red-700">
                Seçilen depoda aktif lokasyon
                bulunmuyor.
              </p>
            )}
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold">
            Yerleştirme Miktarı
          </span>

          <input
            name="quantity"
            type="number"
            min="1"
            max={
              selectedProduct
                ? selectedProduct.unallocatedStock
                : undefined
            }
            step="1"
            placeholder="Miktar"
            className="w-full rounded-xl border p-4"
            required
          />

          {selectedProduct && (
            <p className="mt-2 text-xs text-gray-500">
              En fazla{" "}
              <strong>
                {
                  selectedProduct.unallocatedStock
                }
              </strong>{" "}
              adet yerleştirebilirsiniz.
            </p>
          )}
        </label>
      </div>

      <button
        type="submit"
        disabled={
          isPending ||
          !productId ||
          !warehouseId ||
          !locationId ||
          !selectedProduct ||
          selectedProduct.unallocatedStock <=
            0
        }
        className={`mt-7 w-full rounded-xl py-4 font-bold ${
          !isPending &&
          productId &&
          warehouseId &&
          locationId &&
          selectedProduct &&
          selectedProduct.unallocatedStock > 0
            ? "bg-blue-900 text-white hover:bg-blue-800"
            : "cursor-not-allowed bg-slate-300 text-slate-500"
        }`}
      >
        {isPending
          ? "Stok Yerleştiriliyor..."
          : "Stoğu Lokasyona Yerleştir"}
      </button>
    </form>
  );
}