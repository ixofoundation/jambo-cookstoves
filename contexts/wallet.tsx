import { createContext, useState, useEffect, HTMLAttributes, useContext } from 'react';
import { ChainNetwork } from '@ixo/impactxclient-sdk/types/custom_queries/chain.types';
import { utils } from '@ixo/impactxclient-sdk';
import cls from 'classnames';

import utilsStyles from '@styles/utils.module.scss';
import { SiteHeader } from '@components/Header/Header';
import Loader from '@components/Loader/Loader';
import { ImpactTokens, WALLET, WALLET_TYPE } from 'types/wallet';
import { KEPLR_CHAIN_INFO_TYPE } from 'types/chain';
import { VALIDATOR } from 'types/validators';
import { getLocalStorage, setLocalStorage } from '@utils/persistence';
import { initializeWallet } from '@utils/wallets';
import { queryAllBalances, queryGranterGrants, queryIidDocument } from '@utils/query';
import { EVENT_LISTENER_TYPE } from '@constants/events';
import useWalletData from '@hooks/useWalletData';
import { ChainContext } from './chain';
import { getOpera } from '@utils/opera';
import { getKeplr } from '@utils/keplr';
import { Entity, EntityAccount } from 'types/entity';
import { getUserCarbonTokensByAddress, getUserDevicesByOwnerAddress } from '@utils/graphql';
import { fetchEntityProfile } from '@utils/entity';

export const WalletContext = createContext({
  wallet: {} as WALLET,
  updateWalletType: (newWalletType: WALLET_TYPE) => {},
  updateWalletUserDid: (did: string) => {},
  fetchAssets: () => {},
  clearAssets: () => {},
  updateChainId: (chainId: string) => {},
  updateChainNetwork: (chainNetwork: ChainNetwork) => {},
  logoutWallet: () => {},
  validators: [] as VALIDATOR[],
  entities: [] as Entity[],
  carbon: {} as ImpactTokens,
  updateEntities: async () => Promise<Entity[]>,
  updateValidators: async () => {},
  updateValidatorAvatar: (validatorAddress: string, avatarUrl: string) => {},
});

const DEFAULT_WALLET: WALLET = {
  walletType: undefined,
  user: undefined,
};

export const WalletProvider = ({ children }: HTMLAttributes<HTMLDivElement>) => {
  const [wallet, setWallet] = useState<WALLET>(DEFAULT_WALLET);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [validators, setValidators] = useState<VALIDATOR[]>();
  const [entities, setEntities] = useState<Entity[]>();
  const { chain, chainInfo, queryClient, updateChainId, updateChainNetwork, graphqlClient } = useContext(ChainContext);
  const [balances, fetchBalances, clearBalances] = useWalletData(queryAllBalances, wallet?.user?.address);
  const [carbon, setCarbon] = useState<ImpactTokens>();
  // const [delegations, fetchDelegations, clearDelegations] = useWalletData(
  //   queryDelegatorDelegations,
  //   wallet?.user?.address,
  // );
  // const [delegationRewards, fetchDelegationRewards, clearDelegationRewards] = useWalletData(
  //   queryDelegationTotalRewards,
  //   wallet?.user?.address,
  // );
  // const [unbondingDelegations, fetchUnbondingDelegations, clearUnbondingDelegations] = useWalletData(
  //   queryDelegatorUnbondingDelegations,
  //   wallet?.user?.address,
  // );

  const updateWallet = (newWallet: WALLET, override: boolean = false) => {
    if (override) setWallet({ ...DEFAULT_WALLET, ...newWallet });
    else setWallet((currentWallet) => ({ ...currentWallet, ...newWallet }));
  };

  const updateWalletType = (newWalletType: WALLET_TYPE) => updateWallet({ walletType: newWalletType });

  // @ts-ignore
  const updateWalletUserDid = (did: string) => updateWallet({ user: { ...wallet.user, did } });

  const initializeWallets = async () => {
    try {
      let user = await initializeWallet(wallet.walletType, chainInfo as KEPLR_CHAIN_INFO_TYPE);
      if (user?.pubKey) {
        const did = utils.did.generateSecpDid(user.pubKey);
        const didLedgered = queryClient ? await queryIidDocument(queryClient, did) : undefined;
        user.did = didLedgered ? did : undefined;
      }
      updateWallet({ user });
    } catch (error) {
      console.error('Initializing wallets error:', error);
    }
  };

  const logoutWallet = () => updateWallet({}, true);

  const fetchImpactTokens = async () => {
    try {
      if (!graphqlClient) throw new Error('Missing graphql client');
      if (!wallet?.user?.address) throw new Error('Missing wallet address');
      if (!queryClient) throw new Error('Missing query client');
      const carbonTokens = await getUserCarbonTokensByAddress(graphqlClient!, wallet.user!.address!);
      setCarbon(carbonTokens);
    } catch (error) {
      console.error(error);
      setCarbon({} as ImpactTokens);
    }
  };

  const fetchAssets = () => {
    fetchBalances();
    fetchImpactTokens();
    // fetchDelegations();
    // fetchDelegationRewards();
    // fetchUnbondingDelegations();
  };
  const clearAssets = () => {
    clearBalances();
    fetchImpactTokens();
    // clearDelegations();
    // clearDelegationRewards();
    // clearUnbondingDelegations();
  };

  const updateEntities = async (): Promise<Entity[]> => {
    try {
      console.log('updateEntities');
      if (!graphqlClient) throw new Error('Missing graphql client');
      if (!wallet?.user?.address) throw new Error('Missing wallet address');
      let entitiesList = await getUserDevicesByOwnerAddress(graphqlClient, wallet.user!.address!);
      if (!entitiesList.length) throw new Error('No entities found');
      const newEntities = [];
      for (const entity of entitiesList) {
        const [entityProfile, userAuthzResponse, entityAuthzResponse] = await Promise.allSettled([
          fetchEntityProfile(entity),
          queryGranterGrants(queryClient!, wallet.user!.address!),
          queryGranterGrants(queryClient!, entity?.accounts?.find((a: EntityAccount) => a.name === 'admin')?.address!),
        ]);
        const profile = entityProfile?.status === 'fulfilled' ? entityProfile.value : undefined;
        console.log({ profile });
        const userAuthz =
          userAuthzResponse?.status === 'fulfilled' &&
          !!userAuthzResponse.value?.find(
            (g) =>
              g.authorization?.typeUrl === '/cosmos.authz.v1beta1.GenericAuthorization' &&
              g.authorization.value?.msg === '/ixo.token.v1beta1.MsgTransferToken',
          );
        const entityAuthz =
          entityAuthzResponse?.status === 'fulfilled' &&
          !!entityAuthzResponse.value?.find(
            (g) =>
              g.authorization?.typeUrl === '/cosmos.authz.v1beta1.GenericAuthorization' &&
              g.authorization.value?.msg === '/ixo.token.v1beta1.MsgTransferToken',
          );
        newEntities.push({
          ...entity,
          profile,
          userAuthz,
          entityAuthz,
        });
      }
      setEntities(newEntities);
      return newEntities;
    } catch (error) {
      console.error(error);
      setEntities([]);
      return [];
    }
  };

  useEffect(() => {
    if (queryClient && !entities?.filter((e) => e.userAuthz && e.entityAuthz).length) updateEntities();
  }, [queryClient]);

  // const updateValidators = async () => {
  //   try {
  //     if (!queryClient?.cosmos || !wallet?.walletType) return;
  //     const validatorList = await queryValidators(queryClient);
  //     setValidators((prevState) =>
  //       validatorList.map((validator: VALIDATOR) => {
  //         const prevValidator = prevState?.find((v) => v.address === validator.address);
  //         if (prevValidator) {
  //           return { ...prevValidator, ...validator, avatarUrl: prevValidator.avatarUrl };
  //         }
  //         return validator;
  //       }),
  //     );
  //     // fetchDelegations();
  //     // fetchDelegationRewards();
  //     // fetchUnbondingDelegations();
  //   } catch (error) {
  //     console.error(error);
  //   }
  // };

  // const updateValidatorAvatar = async (validatorAddress: string, avatarUrl: string) => {
  //   if (!validators?.length) return;
  //   const validatorIndex = validators.findIndex((v) => v.address === validatorAddress);
  //   if (validatorIndex < 0) return;
  //   setValidators((prevState: VALIDATOR[] | undefined) =>
  //     !prevState
  //       ? prevState
  //       : [
  //           ...prevState.slice(0, validatorIndex),
  //           { ...prevState[validatorIndex], avatarUrl },
  //           ...prevState.slice(validatorIndex + 1),
  //         ],
  //   );
  // };

  const updateKeplrWallet = async () => {
    if (loaded && wallet.walletType) initializeWallets();
  };

  const updateWalletConnectWallet = async () => {
    if (loaded && wallet.walletType) initializeWallets();
  };

  useEffect(() => {
    if (loaded) fetchAssets();
    // @ts-ignore
    if (!queryClient && validators?.length) setValidators();
    if (wallet.user?.address && !entities?.length) updateEntities();
  }, [wallet.user?.address, queryClient, chain.chainId]);

  useEffect(() => {
    if (loaded) setLocalStorage('wallet', wallet);
  }, [wallet]);

  useEffect(() => {
    if (loaded && wallet.walletType) initializeWallets();
    if (wallet.walletType === WALLET_TYPE.keplr) {
      window.addEventListener(EVENT_LISTENER_TYPE.wc_sessionupdate, updateWalletConnectWallet);
      window.removeEventListener(EVENT_LISTENER_TYPE.wc_sessiondelete, logoutWallet);
      window.addEventListener(EVENT_LISTENER_TYPE.keplr_keystorechange, updateKeplrWallet);

      return () => window.removeEventListener(EVENT_LISTENER_TYPE.keplr_keystorechange, updateKeplrWallet);
    } else if (wallet.walletType === WALLET_TYPE.walletConnect) {
      window.removeEventListener(EVENT_LISTENER_TYPE.keplr_keystorechange, updateKeplrWallet);
      window.addEventListener(EVENT_LISTENER_TYPE.wc_sessionupdate, updateWalletConnectWallet);
      window.addEventListener(EVENT_LISTENER_TYPE.wc_sessiondelete, logoutWallet);

      return () => {
        window.removeEventListener(EVENT_LISTENER_TYPE.wc_sessionupdate, updateWalletConnectWallet);
        window.removeEventListener(EVENT_LISTENER_TYPE.wc_sessiondelete, logoutWallet);
      };
    } else {
      window.removeEventListener(EVENT_LISTENER_TYPE.keplr_keystorechange, updateKeplrWallet);
      window.removeEventListener(EVENT_LISTENER_TYPE.wc_sessionupdate, updateWalletConnectWallet);
      window.removeEventListener(EVENT_LISTENER_TYPE.wc_sessiondelete, logoutWallet);
    }
  }, [wallet.walletType, chain.chainId, chain.chainNetwork]);

  useEffect(() => {
    if (!chain.chainLoading && loaded && wallet.walletType) initializeWallets();
    if (!chain.chainLoading) {
      const operaWallet = getOpera();
      const keplrWallet = getKeplr();
      if (operaWallet && !keplrWallet) updateWalletType(WALLET_TYPE.opera);
      if (!operaWallet && keplrWallet) updateWalletType(WALLET_TYPE.keplr);
    }
  }, [chain.chainLoading]);

  useEffect(() => {
    // Comment out below to reset config
    // setLocalStorage('wallet', {});
    const persistedWallet = getLocalStorage<WALLET>('wallet');
    setLoaded(true);
    if (persistedWallet) setWallet(persistedWallet);
  }, []);

  const value = {
    wallet: {
      ...wallet,
      balances,
      delegations: [],
      delegationRewards: [],
      unbondingDelegations: [],
      loading:
        balances.loading ||
        // delegations.loading ||
        // delegationRewards.loading ||
        // unbondingDelegations.loading ||
        chain.chainLoading,
    } as WALLET,
    updateWalletType,
    updateWalletUserDid,
    fetchAssets,
    clearAssets,
    updateChainId: updateChainId(clearAssets),
    updateChainNetwork: updateChainNetwork(clearAssets),
    logoutWallet,
    updateValidators: async () => {},
    updateValidatorAvatar: (validatorAddress: string, avatarUrl: string) => {},
    updateEntities,
    entities: (entities ?? []) as Entity[],
    carbon: (carbon ?? {}) as ImpactTokens,
    validators: [], // generateValidators(
    //   validators,
    //   (delegations as WALLET_DELEGATIONS)?.data,
    //   (delegationRewards as WALLET_DELEGATION_REWARDS)?.data?.rewards,
    // ) as VALIDATOR[],
  };

  return (
    // @ts-ignore
    <WalletContext.Provider value={value}>
      {!loaded || entities === undefined || carbon === undefined ? (
        <main className={cls(utilsStyles.main, utilsStyles.columnCenter)}>
          <SiteHeader displayLogo displayName />
          <div className={utilsStyles.spacer3} />
          <Loader size={30} />
        </main>
      ) : (
        children
      )}
    </WalletContext.Provider>
  );
};
