"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  assignWmsAccessAction,
  connectWarehouseAction,
  createLogisticsCenterAction,
  createWmsCompanyAction,
  type WmsStructureActionState,
} from "@/app/admin/wms-structure/actions";

type CompanyOption = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

type CenterOption = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

type WarehouseOption = {
  id: number;
  code: string;
  name: string;
  companyId: string;
  logisticsCenterId: string;
};

type UserOption = {
  id: string;
  username: string;
  name: string;
  status: string;
};

type Props = {
  companies: CompanyOption[];
  centers: CenterOption[];
  warehouses: WarehouseOption[];
  users: UserOption[];
};

const initialState: WmsStructureActionState = {
  success: false,
  message: "",
};

function ResultMessage({ state }: { state: WmsStructureActionState }) {
  if (!state.message) {
    return null;
  }

  return (
    <div
      role="alert"
      className={
        "mt-5 rounded-xl border p-4 " +
        (
          state.success
            ? "border-green-200 bg-green-50 text-green-800"
            : "border-red-200 bg-red-50 text-red-800"
        )
      }
    >
      <p className="font-bold">
        {state.success ? "İşlem başarılı" : "İşlem gerçekleştirilemedi"}
      </p>
      <p className="mt-1 text-sm leading-6">{state.message}</p>
    </div>
  );
}

function SubmitButton({
  pending,
  text,
  pendingText,
}: {
  pending: boolean;
  text: string;
  pendingText: string;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className={
        "mt-6 w-full rounded-xl py-4 font-bold text-white " +
        (
          pending
            ? "cursor-not-allowed bg-slate-400"
            : "bg-blue-900 hover:bg-blue-800"
        )
      }
    >
      {pending ? pendingText : text}
    </button>
  );
}

export default function WmsStructureManager({
  companies,
  centers,
  warehouses,
  users,
}: Props) {
  const companyFormRef = useRef<HTMLFormElement>(null);
  const centerFormRef = useRef<HTMLFormElement>(null);

  const [companyState, companyAction, companyPending] =
    useActionState(createWmsCompanyAction, initialState);
  const [centerState, centerAction, centerPending] =
    useActionState(createLogisticsCenterAction, initialState);
  const [warehouseState, warehouseAction, warehousePending] =
    useActionState(connectWarehouseAction, initialState);
  const [accessState, accessAction, accessPending] =
    useActionState(assignWmsAccessAction, initialState);

  const [selectedCompanyId, setSelectedCompanyId] = useState(
    companies.find((company) => company.isActive)?.id ?? "",
  );

  const companyWarehouses = useMemo(
    () =>
      warehouses.filter(
        (warehouse) => warehouse.companyId === selectedCompanyId,
      ),
    [selectedCompanyId, warehouses],
  );

  useEffect(() => {
    if (companyState.success) {
      companyFormRef.current?.reset();
    }
  }, [companyState.success, companyState.message]);

  useEffect(() => {
    if (centerState.success) {
      centerFormRef.current?.reset();
    }
  }, [centerState.success, centerState.message]);

  return (
    <div className="mt-10 grid gap-8 2xl:grid-cols-2">
      <form
        ref={companyFormRef}
        action={companyAction}
        className="rounded-2xl bg-white p-6 shadow"
      >
        <h2 className="text-2xl font-black">Yeni Stok Sahibi Şirket</h2>
        <p className="mt-2 text-sm text-gray-500">
          Depolama hizmeti verilecek müşteri şirketini tanımlayın.
        </p>

        <ResultMessage state={companyState} />

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Şirket Kodu</span>
            <input
              name="code"
              maxLength={30}
              placeholder="Örneğin: ABC"
              className="w-full rounded-xl border p-4 uppercase"
              required
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Kısa Adı</span>
            <input
              name="name"
              placeholder="ABC Tekstil"
              className="w-full rounded-xl border p-4"
              required
            />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-semibold">Ticari Unvanı</span>
            <input
              name="legalName"
              className="w-full rounded-xl border p-4"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Vergi Dairesi</span>
            <input name="taxOffice" className="w-full rounded-xl border p-4" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Vergi Numarası</span>
            <input name="taxNumber" className="w-full rounded-xl border p-4" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Yetkili</span>
            <input name="contactName" className="w-full rounded-xl border p-4" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Telefon</span>
            <input name="phone" className="w-full rounded-xl border p-4" />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-semibold">E-posta</span>
            <input name="email" type="email" className="w-full rounded-xl border p-4" />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-semibold">Adres</span>
            <textarea
              name="address"
              rows={3}
              className="w-full resize-none rounded-xl border p-4"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">İl</span>
            <input name="city" className="w-full rounded-xl border p-4" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">İlçe</span>
            <input name="district" className="w-full rounded-xl border p-4" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Posta Kodu</span>
            <input name="postalCode" className="w-full rounded-xl border p-4" />
          </label>
        </div>

        <SubmitButton
          pending={companyPending}
          text="Şirketi Kaydet"
          pendingText="Şirket Kaydediliyor..."
        />
      </form>

      <form
        ref={centerFormRef}
        action={centerAction}
        className="rounded-2xl bg-white p-6 shadow"
      >
        <h2 className="text-2xl font-black">Yeni Lojistik Merkezi</h2>
        <p className="mt-2 text-sm text-gray-500">
          Bir veya birden fazla şirket deposunun bulunduğu fiziksel tesisi tanımlayın.
        </p>

        <ResultMessage state={centerState} />

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Merkez Kodu</span>
            <input
              name="code"
              maxLength={30}
              placeholder="Örneğin: AVRUPA-01"
              className="w-full rounded-xl border p-4 uppercase"
              required
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Merkez Adı</span>
            <input
              name="name"
              placeholder="Avrupa Yakası Lojistik Merkezi"
              className="w-full rounded-xl border p-4"
              required
            />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-semibold">Adres</span>
            <textarea
              name="address"
              rows={4}
              className="w-full resize-none rounded-xl border p-4"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">İl</span>
            <input name="city" className="w-full rounded-xl border p-4" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">İlçe</span>
            <input name="district" className="w-full rounded-xl border p-4" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Posta Kodu</span>
            <input name="postalCode" className="w-full rounded-xl border p-4" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Telefon</span>
            <input name="phone" className="w-full rounded-xl border p-4" />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-semibold">E-posta</span>
            <input name="email" type="email" className="w-full rounded-xl border p-4" />
          </label>
        </div>

        <SubmitButton
          pending={centerPending}
          text="Lojistik Merkezini Kaydet"
          pendingText="Merkez Kaydediliyor..."
        />
      </form>

      <form action={warehouseAction} className="rounded-2xl bg-white p-6 shadow">
        <h2 className="text-2xl font-black">Depoyu Şirkete Bağla</h2>
        <p className="mt-2 text-sm text-gray-500">
          Mevcut deponun stok sahibi şirketini ve fiziksel merkezini belirleyin.
        </p>

        <ResultMessage state={warehouseState} />

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Depo</span>
            <select name="warehouseId" className="w-full rounded-xl border bg-white p-4" required>
              <option value="">Depo seçin</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.code} - {warehouse.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Stok Sahibi Şirket</span>
            <select name="companyId" className="w-full rounded-xl border bg-white p-4" required>
              <option value="">Şirket seçin</option>
              {companies
                .filter((company) => company.isActive)
                .map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.code} - {company.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Lojistik Merkezi</span>
            <select
              name="logisticsCenterId"
              className="w-full rounded-xl border bg-white p-4"
              required
            >
              <option value="">Lojistik merkezi seçin</option>
              {centers
                .filter((center) => center.isActive)
                .map((center) => (
                  <option key={center.id} value={center.id}>
                    {center.code} - {center.name}
                  </option>
                ))}
            </select>
          </label>
        </div>

        <SubmitButton
          pending={warehousePending}
          text="Depo Bağlantısını Güncelle"
          pendingText="Bağlantı Güncelleniyor..."
        />
      </form>

      <form action={accessAction} className="rounded-2xl bg-white p-6 shadow">
        <h2 className="text-2xl font-black">Kullanıcı Şirket ve Depo Erişimi</h2>
        <p className="mt-2 text-sm text-gray-500">
          Kullanıcının çalışabileceği stok sahibi şirketi ve depoları seçin.
        </p>

        <ResultMessage state={accessState} />

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Kullanıcı</span>
            <select name="userId" className="w-full rounded-xl border bg-white p-4" required>
              <option value="">Kullanıcı seçin</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} (@{user.username}) - {user.status}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Şirket</span>
            <select
              name="companyId"
              value={selectedCompanyId}
              onChange={(event) => setSelectedCompanyId(event.target.value)}
              className="w-full rounded-xl border bg-white p-4"
              required
            >
              <option value="">Şirket seçin</option>
              {companies
                .filter((company) => company.isActive)
                .map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.code} - {company.name}
                  </option>
                ))}
            </select>
          </label>

          <fieldset className="rounded-xl border p-4">
            <legend className="px-2 text-sm font-bold">Erişilebilecek Depolar</legend>
            <div className="mt-2 space-y-3">
              {companyWarehouses.map((warehouse) => (
                <label
                  key={warehouse.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg bg-slate-50 p-3"
                >
                  <input
                    type="checkbox"
                    name="warehouseIds"
                    value={warehouse.id}
                    className="h-5 w-5"
                  />
                  <span>
                    <span className="block font-bold">{warehouse.code}</span>
                    <span className="text-sm text-gray-500">{warehouse.name}</span>
                  </span>
                </label>
              ))}

              {selectedCompanyId && companyWarehouses.length === 0 && (
                <p className="text-sm text-amber-700">
                  Bu şirkete bağlı depo bulunmuyor. Önce depo bağlantısını güncelleyin.
                </p>
              )}
            </div>
          </fieldset>
        </div>

        <SubmitButton
          pending={accessPending}
          text="Kullanıcı Erişimini Kaydet"
          pendingText="Erişim Kaydediliyor..."
        />
      </form>
    </div>
  );
}
