import { gql } from '@apollo/client';
import { GRAPHQL_CLIENT } from 'types/graphql';

const GET_USER_DEVICES_BY_OWNER_ADDRESS = gql`
  query getUserDevicesByOwnerAddress($ownerAddress: String!) {
    devices: entities(filter: { type: { equalTo: "asset/device" }, owner: { equalTo: $ownerAddress } }) {
      nodes {
        alsoKnownAs
        accounts
        context
        id
        linkedEntity
        linkedResource
        metadata
        owner
        service
        settings
        type
        status
      }
    }
  }
`;
export async function getUserDevicesByOwnerAddress(graphqlClient: GRAPHQL_CLIENT, ownerAddress: string) {
  const data = await graphqlClient.query({
    query: GET_USER_DEVICES_BY_OWNER_ADDRESS,
    variables: { ownerAddress },
  });

  return data?.data?.devices?.nodes ?? [];
}

const GET_USER_CARBON_TOKENS_BY_ADDRESS = gql`
  query MyQuery($address: String!) {
    getAccountTokens(address: $address, name: "CARBON")
  }
`;
export async function getUserCarbonTokensByAddress(graphqlClient: GRAPHQL_CLIENT, address: string) {
  const data = await graphqlClient.query({
    query: GET_USER_CARBON_TOKENS_BY_ADDRESS,
    variables: { address },
  });
  return data?.data?.getAccountTokens?.CARBON
    ? {
        ...data.data.getAccountTokens.CARBON,
        tokens: Object.entries(data.data.getAccountTokens.CARBON?.tokens ?? {})?.map(
          ([tokenId, tokenBatch]: [string, any]) => ({
            tokenId,
            collection: tokenBatch.collection,
            amount: tokenBatch?.amount ?? 0,
            minted: tokenBatch?.minted ?? 0,
            retired: tokenBatch?.retired ?? 0,
          }),
        ),
      }
    : {
        contractAddress: '',
        description: '',
        image: '',
        tokens: [],
      };
}

const GET_USER_CARBON_TRANSACTIONS_BY_ADDRESS = gql`
  query GetUserCarbonTransactionsByAddress($address: String!, $offset: Int!, $limit: Int!) {
    messages(
      filter: {
        tokenNames: { equalTo: ["CARBON"] }
        or: [
          # { typeUrl: { equalTo: "/ixo.token.v1beta1.MsgMintToken" } }
          # { typeUrl: { equalTo: "/ixo.token.v1beta1.MsgRetireToken" } }
          { typeUrl: { equalTo: "/ixo.token.v1beta1.MsgTransferToken" } }
        ]
        and: { or: [{ from: { equalTo: $address } }, { to: { equalTo: $address } }] }
      }
      first: $limit
      orderBy: ID_DESC
      offset: $offset
    ) {
      nodes {
        id
        transactionHash
        typeUrl
        from
        to
        value
        transactionByTransactionHash {
          time
        }
      }
      totalCount
    }
  }
`;
export async function getUserCarbonTransactionsByAddress(graphqlClient: GRAPHQL_CLIENT, address: string) {
  const limit = 20;
  const data = await graphqlClient.query({
    query: GET_USER_CARBON_TRANSACTIONS_BY_ADDRESS,
    variables: { address, offset: 0, limit },
  });

  return data?.data?.messages?.nodes ?? [];
}
