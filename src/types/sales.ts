import { PaymentMethod, TCustomer, TProduct, TSaleItem } from "./database";

  
export type SALE_SaleItem = Partial<TSaleItem> & {
    product: Partial<TProduct>;
  } 
  
  export interface SALE_Sale {
    id?: string;
    customer: Partial<TCustomer>;
    items: SALE_SaleItem[];
    discount: number;
    total: number;
    date: Date;
    paymentMethod?: PaymentMethod;
  }
  
  export interface ActiveSale {
    id: string;
    customer: TCustomer | null;
    items: SALE_SaleItem[];
    status: "active" | "paused" | "completed";
    total: number;
  }
