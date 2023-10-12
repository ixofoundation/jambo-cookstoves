import { useContext, useEffect, useState } from 'react';
import { cosmos, utils } from '@ixo/impactxclient-sdk';
import type { NextPage } from 'next';
import cls from 'classnames';

import utilsStyles from '@styles/utils.module.scss';
import styles from '@styles/pelletsPage.module.scss';
import Header from '@components/Header/Header';
import Head from '@components/Head/Head';
import config from '@constants/config.json';
import { WalletContext } from '@contexts/wallet';
import ColoredIcon, { ICON_COLOR } from '@components/ColoredIcon/ColoredIcon';
import { ChainContext } from '@contexts/chain';
import { broadCastMessages } from '@utils/wallets';
import Loader from '@components/Loader/Loader';
import ImageWithFallback from '@components/ImageFallback/ImageFallback';
import Stepper from '@components/Stepper/Stepper';
import PelletBagsIcon from '@icons/pellet_bags.svg';
import ThumbsUpIcon from '@icons/thumbs_up.svg';
import {
  defaultTrxFeeOption,
  generateExecTrx,
  generateGenericAuthorizationTrx,
  generateGrantEntityAccountAuthzTrx,
  generateTransferTokenTrx,
} from '@utils/transactions';
import { countCarbon, countUserCarbon, determineTokensSend } from '@utils/entity';
import { queryAllowances } from '@utils/query';
import Footer from '@components/Footer/Footer';
import { addMinutesToDate } from '@utils/misc';
import RoundedCheck from '@icons/custom_rounded_check.svg';
import { PELLETS } from '@constants/supamoto';

const Pellets: NextPage = () => {
  const [selected, setSelected] = useState<any>(3);
  const [successHash, setSuccessHash] = useState<string>();
  const [loading, setLoading] = useState<boolean>(false);

  const { fetchAssets, carbon, wallet, entities } = useContext(WalletContext);
  const { chainInfo, queryClient } = useContext(ChainContext);

  const affordable = PELLETS[selected]?.carbon <= countUserCarbon(carbon);

  useEffect(() => {
    fetchAssets();
  }, []);

  const handleSubmit = async () => {
    if (!affordable) return;
    try {
      setLoading(true);

      let [carbonSourceType, carbonSourceTokens] = ['user', carbon[wallet.user!?.address]?.tokens];

      if (countCarbon(carbonSourceTokens ?? []) < PELLETS[selected]?.carbon) {
        let newSource = Object.entries(carbon)
          ?.map(([a, v]) => ({ ...v, address: a }))
          ?.find((v) => countCarbon(v?.tokens) >= PELLETS[selected]?.carbon);
        if (newSource) {
          carbonSourceTokens = newSource?.tokens;
          carbonSourceType = newSource.address;
        }
      }

      if (!countCarbon(carbonSourceTokens) || countCarbon(carbonSourceTokens) < PELLETS[selected]?.carbon)
        throw new Error('Not enough CARBON');

      const trxs = [];

      if (carbonSourceType === 'user') {
        trxs.push(
          generateTransferTokenTrx({
            owner: wallet.user!?.address!,
            recipient: process.env.NEXT_PUBLIC_PELLET_ADDRESS ?? '',
            tokens: determineTokensSend(carbonSourceTokens, PELLETS[selected]?.carbon),
          }),
        );
      } else {
        const entity = entities.find((e) => e?.accounts?.find((a) => a.address === carbonSourceType));
        if (!entity) throw new Error('Entity not found');
        trxs.push(
          generateGrantEntityAccountAuthzTrx({
            entityDid: entity?.id,
            owner: wallet.user!?.address,
            name: 'admin',
            granteeAddress: wallet.user!?.address,
            grant: cosmos.authz.v1beta1.Grant.fromPartial({
              // @ts-ignore
              authorization: generateGenericAuthorizationTrx(
                {
                  msg: '/ixo.token.v1beta1.MsgTransferToken',
                },
                true,
              ),
              expiration: utils.proto.toTimestamp(addMinutesToDate(new Date(), 5)),
            }),
          }),
        );
        trxs.push(
          generateExecTrx({
            grantee: wallet.user!?.address,
            msgs: [
              generateTransferTokenTrx(
                {
                  owner: entity.accounts?.find((a) => a.name === 'admin')?.address!,
                  recipient: process.env.NEXT_PUBLIC_PELLET_ADDRESS ?? '',
                  tokens: determineTokensSend(carbonSourceTokens, PELLETS[selected]?.carbon),
                },
                true,
              ),
            ],
          }),
        );
      }

      let allowances = await queryAllowances(queryClient!, wallet.user!.address);

      const hash = await broadCastMessages(
        wallet,
        trxs,
        `SupaMoto: ${PELLETS[selected]?.weight} pellets for ${wallet.user!?.did}`,
        defaultTrxFeeOption,
        'uixo',
        chainInfo!,
        allowances?.allowances[0]?.granter ?? undefined,
      );

      if (!hash) throw new Error('Failed to order Pellets');

      setSuccessHash(hash);
    } catch (error) {
      console.error('Pellets::handleSubmit', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head title={config.siteName} description={config.siteName + ' dApp'} />

      <Header />

      <main className={cls(utilsStyles.main, utilsStyles.noFooter, utilsStyles.columnCenter)}>
        {loading ? (
          <Loader />
        ) : !successHash ? (
          <>
            <ImageWithFallback
              fallbackSrc='/images/chain-logos/fallback.png'
              src='/images/steps/order_pellets.png'
              width={300}
              height={240}
              alt='account'
            />

            <div className={utilsStyles.spacer2} />
            <Stepper
              currentIndex={selected}
              steps={PELLETS.map((p) => p.weight)}
              prefixIcon={PelletBagsIcon}
              onChange={setSelected}
            />
            <div className={utilsStyles.spacer3} />

            <div className={styles.infoRow}>
              <p>Price</p>
              <p className={affordable ? styles.affordable : styles.error}>{PELLETS[selected]?.carbon} CARBON</p>
            </div>
            <div className={utilsStyles.spacer1} />
            <div className={styles.infoRow}>
              <p>Available</p>
              <p>{countUserCarbon(carbon)} CARBON</p>
            </div>
            <div className={utilsStyles.spacer5} />

            <div
              className={cls(styles.button, styles.primary, affordable ? styles.enabled : styles.disabled)}
              onClick={handleSubmit}
            >
              {affordable ? (
                <>
                  <ColoredIcon icon={ThumbsUpIcon} color={ICON_COLOR.lightGrey} size={24} />
                  <p>Order</p>
                </>
              ) : (
                <p>Not enough CARBON</p>
              )}
            </div>
          </>
        ) : (
          <>
            <div className={utilsStyles.relativePosition}>
              <ColoredIcon icon={PelletBagsIcon} color={ICON_COLOR.primary} size={240} />
              <div className={styles.checkIcon}>
                <RoundedCheck width={50} height={50} />
              </div>
            </div>
            <div className={utilsStyles.spacer1} />
            <p className={styles.successMessage}>
              {PELLETS[selected]?.weight} purchased
              <br />
              for {PELLETS[selected]?.carbon} CARBON
              <br />
              produced by clean cooking
            </p>
            <div className={utilsStyles.spacer2} />
            <p className={styles.subSuccessMessage}>Will be delivered shortly</p>
            <div className={utilsStyles.spacer2} />
            <Footer showHomeButton />
          </>
        )}
      </main>
    </>
  );
};

export default Pellets;
