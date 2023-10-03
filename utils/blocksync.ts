// import { Ixo } from '@ixo/ixo-apimodule';

import { CHAIN_NETWORK_TYPE } from 'types/chain';

// const blocksyncApi = new Ixo((process.env.NEXT_PUBLIC_BLOCK_SYNC_URL as string) || 'https://blocksync-pandora.ixo.earth');

// export default blocksyncApi;

export const BLOCKSYNC_GRAPHQL_URLS: { [network in CHAIN_NETWORK_TYPE]: string } = {
  mainnet: 'https://blocksync-graphql.ixo.earth/graphql',
  testnet: 'https://testnet-blocksync-graphql.ixo.earth/graphql',
  devnet: 'https://devnet-blocksync-graphql.ixo.earth/graphql',
};

export const getBlockSyncGraphqlUrl = (network: CHAIN_NETWORK_TYPE): string => BLOCKSYNC_GRAPHQL_URLS[network] ?? '';
