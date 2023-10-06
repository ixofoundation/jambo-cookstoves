import { createContext, useState, useEffect, HTMLAttributes, useContext, useRef } from 'react';
import { ChainNetwork } from '@ixo/impactxclient-sdk/types/custom_queries/chain.types';
import { utils } from '@ixo/impactxclient-sdk';
import cls from 'classnames';

import utilsStyles from '@styles/utils.module.scss';
import { SiteHeader } from '@components/Header/Header';
import Loader from '@components/Loader/Loader';
import { ImpactTokensByAddress, WALLET, WALLET_TYPE } from 'types/wallet';
import { KEPLR_CHAIN_INFO_TYPE } from 'types/chain';
import { VALIDATOR } from 'types/validators';
import { getLocalStorage, setLocalStorage } from '@utils/persistence';
import { initializeWallet } from '@utils/wallets';
import { queryGranterGrants, queryIidDocument } from '@utils/query';
import { EVENT_LISTENER_TYPE } from '@constants/events';
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
  carbon: {} as ImpactTokensByAddress,
  fetchEntities: async () => Promise<Entity[]>,
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
  const [carbon, setCarbon] = useState<ImpactTokensByAddress>();
  const walletInitializing = useRef<boolean>(false);

  const { chain, chainInfo, queryClient, updateChainId, updateChainNetwork, graphqlClient } = useContext(ChainContext);

  const updateWallet = (newWallet: WALLET, override: boolean = false) => {
    if (override) setWallet({ ...DEFAULT_WALLET, ...newWallet });
    else setWallet((currentWallet) => ({ ...currentWallet, ...newWallet }));
  };

  const updateWalletType = (newWalletType: WALLET_TYPE) => updateWallet({ walletType: newWalletType });

  // @ts-ignore
  const updateWalletUserDid = (did: string) => updateWallet({ user: { ...wallet.user, did } });

  const initializeWallets = async () => {
    if (walletInitializing.current) return;
    walletInitializing.current = true;
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
    } finally {
      walletInitializing.current = false;
    }
  };

  const logoutWallet = () => updateWallet({}, true);

  const fetchImpactTokens = async () => {
    try {
      if (!graphqlClient) return setCarbon({} as ImpactTokensByAddress); // throw new Error('Missing graphql client');
      if (!wallet?.user?.address) return setCarbon({} as ImpactTokensByAddress); // throw new Error('Missing wallet address');
      const carbonTokens = await getUserCarbonTokensByAddress(graphqlClient!, wallet.user!.address!);
      setCarbon((prevState) => ({ ...(prevState ?? {}), [wallet.user!.address!]: carbonTokens }));
      const entitiesForCarbon = (entities ?? [])
        .map((e) => (e.userAuthz && e.entityAuthz ? e.accounts?.find((a) => a.name === 'admin')?.address : undefined))
        .filter((a) => a) as string[];
      if (entitiesForCarbon) {
        const entitiesCarbon = await Promise.allSettled(
          entitiesForCarbon.map((a: string) => getUserCarbonTokensByAddress(graphqlClient!, a!)),
        );
        entitiesCarbon.forEach((e, i) => {
          if (e.status === 'fulfilled')
            setCarbon((prevState) => ({ ...(prevState ?? {}), [entitiesForCarbon[i]]: e.value }));
        });
      }
    } catch (error) {
      console.error(error);
      setCarbon({} as ImpactTokensByAddress);
    }
  };

  const fetchAssets = () => {
    fetchImpactTokens();
  };
  const clearAssets = () => {
    fetchImpactTokens();
  };

  const fetchEntities = async (): Promise<Entity[]> => {
    try {
      if (!graphqlClient) {
        setEntities([]);
        return [];
      }
      if (!wallet?.user?.address) {
        setEntities([]);
        return [];
      }
      let entitiesList = await getUserDevicesByOwnerAddress(graphqlClient, wallet.user!.address!);
      if (!entitiesList.length) {
        setEntities([]);
        return [];
      }
      const newEntities = [];
      for (const entity of entitiesList) {
        const [entityProfile, userAuthzResponse, entityAuthzResponse] = await Promise.allSettled([
          fetchEntityProfile(entity),
          queryClient ? queryGranterGrants(queryClient!, wallet.user!.address!) : undefined,
          queryClient
            ? queryGranterGrants(
                queryClient!,
                entity?.accounts?.find((a: EntityAccount) => a.name === 'admin')?.address!,
              )
            : undefined,
        ]);
        const profile = entityProfile?.status === 'fulfilled' ? entityProfile.value : undefined;
        const userAuthzEntity =
          userAuthzResponse?.status === 'fulfilled' &&
          !!userAuthzResponse.value?.find(
            (g) =>
              g.authorization?.typeUrl === '/cosmos.authz.v1beta1.GenericAuthorization' &&
              g.authorization.value?.msg === '/ixo.entity.v1beta1.MsgTransferEntity',
          );
        const userAuthZTokens =
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
          userAuthz: userAuthZTokens && userAuthzEntity,
          entityAuthz,
        });
      }
      setEntities(newEntities);
      fetchImpactTokens();
      return newEntities;
    } catch (error) {
      console.error(error);
      setEntities([]);
      return [];
    }
  };

  useEffect(() => {
    if (queryClient && !entities?.filter((e) => e.userAuthz && e.entityAuthz).length) fetchEntities();
  }, [queryClient]);

  const updateKeplrWallet = async () => {
    if (loaded && wallet.walletType) initializeWallets();
  };

  useEffect(() => {
    if (loaded) fetchAssets();
    // @ts-ignore
    if (!queryClient && validators?.length) setValidators();
    if (wallet.user?.address && !entities?.length) fetchEntities();
  }, [wallet.user?.address, queryClient, chain.chainId]);

  useEffect(() => {
    if (loaded) setLocalStorage('wallet', wallet);
  }, [wallet]);

  useEffect(() => {
    if (loaded && wallet.walletType) initializeWallets();
    if (wallet.walletType === WALLET_TYPE.keplr) {
      window.addEventListener(EVENT_LISTENER_TYPE.keplr_keystorechange, updateKeplrWallet);

      return () => window.removeEventListener(EVENT_LISTENER_TYPE.keplr_keystorechange, updateKeplrWallet);
    } else {
      window.removeEventListener(EVENT_LISTENER_TYPE.keplr_keystorechange, updateKeplrWallet);
    }
  }, [wallet.walletType, chain.chainId, chain.chainNetwork]);

  useEffect(() => {
    // if (!chain.chainLoading && loaded && wallet.walletType) initializeWallets();
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
      balances: [],
      delegations: [],
      delegationRewards: [],
      unbondingDelegations: [],
      loading: chain.chainLoading,
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
    fetchEntities,
    entities: (entities ?? []) as Entity[],
    carbon: (carbon ?? {}) as ImpactTokensByAddress,
    validators: [],
  };

  return (
    // @ts-ignore
    <WalletContext.Provider value={value}>
      {!loaded || entities === undefined || carbon === undefined || (wallet.walletType && !queryClient) ? (
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
