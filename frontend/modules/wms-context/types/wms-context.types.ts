export type WmsContextWarehouseOption = {
  id: number;
  code: string;
  name: string;
  logisticsCenterCode: string;
  logisticsCenterName: string;
  isDefault: boolean;
};

export type WmsContextCompanyOption = {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  isDefault: boolean;
  warehouses: WmsContextWarehouseOption[];
};

export type ActiveWmsContext = {
  tenantId: string;
  companyId: string;
  companyCode: string;
  companyName: string;
  warehouseId: number;
  warehouseCode: string;
  warehouseName: string;
  logisticsCenterCode: string;
  logisticsCenterName: string;
};

export type WmsContextSelectorData = {
  activeContext: ActiveWmsContext | null;
  companies: WmsContextCompanyOption[];
};
