export enum FeegrantTypes {
  BASIC_ALLOWANCE = 'BasicAllowance',
  PERIODIC_ALLOWANCE = 'PeriodicAllowance',
}

export type FeegrantData = {
  type: FeegrantTypes | string;
  granter: string;
  grantee: string;
  expiration?: number;
  limit?: number;
  msgs?: string[];
};
