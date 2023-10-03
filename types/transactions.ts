export type TRX_MSG =
  | {
      type: string;
      value: any;
    }
  | {
      typeUrl: string;
      value: any;
    };

export type TRX_FEE_OPTION = 'low' | 'average' | 'high';

export type TRX_FEE_OPTIONS = {
  low: number;
  average: number;
  high: number;
};

export type HistoricTransaction = {
  id: number;
  hash: string;
  type: string;
  from: string;
  to: string;
  value: any;
  time: string;
};
