import { Coin } from '@ixo/impactxclient-sdk/types/codegen/cosmos/base/v1beta1/coin';
import { cosmos, customMessages, ixo } from '@ixo/impactxclient-sdk';
import { KeyTypes } from '@ixo/impactxclient-sdk/types/messages/iid';
import { StdFee } from '@cosmjs/stargate';

import { TRX_FEE_OPTION, TRX_MSG } from 'types/transactions';
import { Grant } from '@ixo/impactxclient-sdk/types/codegen/cosmos/authz/v1beta1/authz';
import { ImpactToken } from 'types/wallet';

export const defaultTrxFeeOption: TRX_FEE_OPTION = 'average';

export const defaultTrxFee: StdFee = {
  amount: [{ amount: String(5000), denom: 'uixo' }],
  gas: String(300000),
};

const generateCoins = (denoms: string[], amounts: string[]): Coin[] => {
  const coinMap: Record<string, number> = {};
  for (let i = 0; i < denoms!.length; i++) {
    const denom = denoms![i];
    const amount = parseInt(amounts![i]);
    if (coinMap[denom!]) {
      coinMap[denom!] += amount;
    } else {
      coinMap[denom] = amount;
    }
  }
  const coins: Coin[] = [];
  for (const [denom, amount] of Object.entries(coinMap)) {
    coins.push(cosmos.base.v1beta1.Coin.fromPartial({ denom, amount: amount.toString() }));
  }
  return coins;
};

export const generateBankSendTrx = ({
  fromAddress,
  toAddress,
  denom,
  amount,
}: {
  fromAddress: string;
  toAddress: string;
  denom: string;
  amount: string;
}): TRX_MSG => ({
  typeUrl: '/cosmos.bank.v1beta1.MsgSend',
  value: cosmos.bank.v1beta1.MsgSend.fromPartial({
    fromAddress,
    toAddress,
    amount: [cosmos.base.v1beta1.Coin.fromPartial({ amount, denom })],
  }),
});
export const generateBankMultiSendTrx = ({
  fromAddress,
  toAddresses,
  amounts,
  denoms,
}: {
  fromAddress: string;
  toAddresses: string[];
  denoms: string[];
  amounts: string[];
}): TRX_MSG => ({
  typeUrl: '/cosmos.bank.v1beta1.MsgMultiSend',
  value: cosmos.bank.v1beta1.MsgMultiSend.fromPartial({
    inputs: [
      {
        address: fromAddress,
        coins: generateCoins(denoms, amounts),
      },
    ],
    outputs: toAddresses.map((address, index) => ({
      address: address,
      coins: [
        cosmos.base.v1beta1.Coin.fromPartial({
          amount: amounts[index],
          denom: denoms[index],
        }),
      ],
    })),
  }),
});

export const generateDelegateTrx = ({
  delegatorAddress,
  validatorAddress,
  denom,
  amount,
}: {
  delegatorAddress: string;
  validatorAddress: string;
  denom: string;
  amount: string;
}): TRX_MSG => ({
  typeUrl: '/cosmos.staking.v1beta1.MsgDelegate',
  value: cosmos.staking.v1beta1.MsgDelegate.fromPartial({
    delegatorAddress,
    validatorAddress,
    amount: cosmos.base.v1beta1.Coin.fromPartial({ amount, denom }),
  }),
});

export const generateUndelegateTrx = ({
  delegatorAddress,
  validatorAddress,
  denom,
  amount,
}: {
  delegatorAddress: string;
  validatorAddress: string;
  denom: string;
  amount: string;
}): TRX_MSG => ({
  typeUrl: '/cosmos.staking.v1beta1.MsgUndelegate',
  value: cosmos.staking.v1beta1.MsgUndelegate.fromPartial({
    delegatorAddress,
    validatorAddress,
    amount: cosmos.base.v1beta1.Coin.fromPartial({ amount, denom }),
  }),
});

export const generateRedelegateTrx = ({
  delegatorAddress,
  validatorSrcAddress,
  validatorDstAddress,
  denom,
  amount,
}: {
  delegatorAddress: string;
  validatorSrcAddress: string;
  validatorDstAddress: string;
  denom: string;
  amount: string;
}): TRX_MSG => ({
  typeUrl: '/cosmos.staking.v1beta1.MsgBeginRedelegate',
  value: cosmos.staking.v1beta1.MsgBeginRedelegate.fromPartial({
    delegatorAddress,
    validatorSrcAddress,
    validatorDstAddress,
    amount: cosmos.base.v1beta1.Coin.fromPartial({ amount, denom }),
  }),
});

export const generateWithdrawRewardTrx = ({
  delegatorAddress,
  validatorAddress,
}: {
  delegatorAddress: string;
  validatorAddress: string;
}): TRX_MSG => ({
  typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
  value: cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward.fromPartial({
    delegatorAddress,
    validatorAddress,
  }),
});

export const generateCreateIidTrx = ({
  did,
  pubkey,
  address,
  keyType = 'secp',
}: {
  did: string;
  pubkey: Uint8Array;
  address: string;
  keyType?: KeyTypes;
}) => ({
  typeUrl: '/ixo.iid.v1beta1.MsgCreateIidDocument',
  value: ixo.iid.v1beta1.MsgCreateIidDocument.fromPartial({
    id: did,
    verifications: customMessages.iid.createIidVerificationMethods({
      did,
      pubkey,
      address,
      controller: did,
      type: keyType,
    }),
    signer: address,
    controllers: [did],
  }),
});

export const generateGrantEntityAccountAuthzTrx = ({
  entityDid,
  owner,
  name,
  granteeAddress,
  grant,
}: {
  entityDid: string;
  owner: string;
  name: string;
  granteeAddress: string;
  grant: Grant;
}) => ({
  typeUrl: '/ixo.entity.v1beta1.MsgGrantEntityAccountAuthz',
  value: ixo.entity.v1beta1.MsgGrantEntityAccountAuthz.fromPartial({
    id: entityDid,
    ownerAddress: owner,
    name,
    granteeAddress,
    grant,
  }),
});

export const generateGenericAuthorizationTrx = ({ msg }: { msg: string }, encode = false) => {
  const value = cosmos.authz.v1beta1.GenericAuthorization.fromPartial({
    msg,
  });
  return {
    typeUrl: '/cosmos.authz.v1beta1.GenericAuthorization',
    value: encode ? cosmos.authz.v1beta1.GenericAuthorization.encode(value).finish() : value,
  };
};

export const generateAuthzGrantTrx = ({
  granter,
  grantee,
  grant,
}: {
  granter: string;
  grantee: string;
  grant: Grant;
}) => ({
  typeUrl: '/cosmos.authz.v1beta1.MsgGrant',
  value: cosmos.authz.v1beta1.MsgGrant.fromPartial({
    granter,
    grantee,
    grant,
  }),
  // value: grant,
});

export const generateTransferTokenTrx = (
  {
    owner,
    recipient,
    tokens,
  }: {
    owner: string;
    recipient: string;
    tokens: ImpactToken[];
  },
  encode = false,
) => {
  const value = ixo.token.v1beta1.MsgTransferToken.fromPartial({
    owner,
    recipient,
    tokens: tokens.map((b) =>
      ixo.token.v1beta1.TokenBatch.fromPartial({
        id: b.id,
        amount: (b?.amount ?? 0).toString(),
      }),
    ),
  });

  return {
    typeUrl: '/ixo.token.v1beta1.MsgTransferToken',
    value: encode ? ixo.token.v1beta1.MsgTransferToken.encode(value).finish() : value,
  };
};

export const generateExecTrx = ({ grantee, msgs }: { grantee: string; msgs: TRX_MSG[] }) => ({
  typeUrl: '/cosmos.authz.v1beta1.MsgExec',
  value: cosmos.authz.v1beta1.MsgExec.fromPartial({
    grantee,
    msgs: msgs as any[],
  }),
});
