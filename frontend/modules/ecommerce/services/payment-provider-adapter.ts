import "server-only";

export type PaymentInitInput={orderId:number;orderNumber:string;amount:number;currency:string;email:string;callbackUrl:string;installment?:number};
export type PaymentInitResult={externalId:string;redirectUrl?:string|null;htmlContent?:string|null;providerReference?:string|null};
export type PaymentVerifyResult={externalId:string;status:"PAID"|"PENDING"|"FAILED"|"CANCELLED";providerReference?:string|null;maskedCard?:string|null;cardBrand?:string|null;threeDSecure?:boolean;raw?:unknown};
export type PaymentRefundResult={externalId:string;refundedAmount:number;providerReference?:string|null;raw?:unknown};

export interface PaymentProviderAdapter{
 provider:string;
 initialize(input:PaymentInitInput):Promise<PaymentInitResult>;
 verify(externalId:string):Promise<PaymentVerifyResult>;
 refund(externalId:string,amount:number):Promise<PaymentRefundResult>;
}

const registry=new Map<string,()=>PaymentProviderAdapter>();
export function registerPaymentProvider(provider:string,factory:()=>PaymentProviderAdapter){registry.set(provider.trim().toUpperCase(),factory);}
export function getPaymentProvider(provider:string){const factory=registry.get(provider.trim().toUpperCase());if(!factory)throw new Error(`Ödeme sağlayıcısı adaptörü kayıtlı değil: ${provider}`);return factory();}
export function listRegisteredPaymentProviders(){return [...registry.keys()].sort();}
