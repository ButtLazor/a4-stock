export type ItemId = number | string;

export type StockItem = {
  id: ItemId;
  Item: string;
  uom: string | null;
  quantity: number | null;
  is_pinned: boolean;
  display_order: number;
  low_threshold: number;
  high_threshold: number;
};

export type StockInput = Omit<StockItem, 'id'>;
export type StockInsert = StockInput & { id?: ItemId };
export type StockOrderChange = Pick<StockItem, 'id' | 'display_order'>;

export type StockPatch = Partial<StockInput>;
export type StockFilter = 'all' | 'healthy' | 'watch' | 'low';
export type StockStatusKey = 'healthy' | 'watch' | 'low' | 'out' | 'unknown';

export interface StockStatus {
  key: StockStatusKey;
  label: string;
  icon: string;
  level: number;
  guide: string;
}

export interface Database {
  public: {
    Tables: {
      stock_items: {
        Row: StockItem;
        Insert: StockInsert;
        Update: StockPatch;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
