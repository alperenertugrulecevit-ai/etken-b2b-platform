"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type HourlyOperationData = {
  hour: string;
  operationCount: number;
  quantity: number;
};

type HourlyOperationChartProps = {
  data: HourlyOperationData[];
};

type TooltipPayloadItem = {
  dataKey?: string | number;
  value?: number;
};

type CustomTooltipProps = {
  active?: boolean;
  label?: string;
  payload?: TooltipPayloadItem[];
};

function formatNumber(value: number) {
  return value.toLocaleString("tr-TR");
}

function CustomTooltip({
  active,
  label,
  payload,
}: CustomTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const operationCount =
    payload.find(
      (item) => item.dataKey === "operationCount"
    )?.value ?? 0;

  const quantity =
    payload.find(
      (item) => item.dataKey === "quantity"
    )?.value ?? 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
      <p className="font-bold text-slate-950">
        Saat {label}
      </p>

      <div className="mt-3 space-y-1 text-sm">
        <p className="text-slate-600">
          İşlem sayısı:{" "}
          <strong className="text-slate-950">
            {formatNumber(operationCount)}
          </strong>
        </p>

        <p className="text-slate-600">
          Toplam miktar:{" "}
          <strong className="text-slate-950">
            {formatNumber(quantity)}
          </strong>
        </p>
      </div>
    </div>
  );
}

export default function HourlyOperationChart({
  data,
}: HourlyOperationChartProps) {
  const hasData = data.some(
    (item) =>
      item.operationCount > 0 || item.quantity > 0
  );

  if (!hasData) {
    return (
      <div className="flex h-80 items-center justify-center rounded-2xl bg-slate-50 text-center text-slate-500">
        Bugün için grafik oluşturacak başarılı
        operasyon kaydı bulunmuyor.
      </div>
    );
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{
            top: 10,
            right: 10,
            bottom: 0,
            left: -15,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
          />

          <XAxis
            dataKey="hour"
            tickLine={false}
            axisLine={false}
            interval={1}
            fontSize={12}
          />

          <YAxis
            yAxisId="left"
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            fontSize={12}
          />

          <YAxis
            yAxisId="right"
            orientation="right"
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            fontSize={12}
          />

          <Tooltip content={<CustomTooltip />} />

          <Bar
            yAxisId="left"
            dataKey="operationCount"
            name="İşlem sayısı"
            fill="currentColor"
            className="text-slate-900"
            radius={[6, 6, 0, 0]}
            maxBarSize={34}
          />

          <Line
            yAxisId="right"
            type="monotone"
            dataKey="quantity"
            name="Toplam miktar"
            stroke="currentColor"
            className="text-indigo-600"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}