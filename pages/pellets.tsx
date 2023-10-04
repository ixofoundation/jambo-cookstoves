import { useContext, useEffect, useRef, useState } from 'react';
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
import PriceTagIcon from '@icons/price_tag.svg';
import ThumbsUpIcon from '@icons/thumbs_up.svg';
import { defaultTrxFeeOption, generateTransferTokenTrx } from '@utils/transactions';
import { countTokens, determineTokensSend } from '@utils/entity';
import { queryAllowances } from '@utils/query';
import Footer from '@components/Footer/Footer';

const PELLETS = [
  {
    weight: '5 KG',
    carbon: 250,
  },
  {
    weight: '10 KG',
    carbon: 500,
  },
  {
    weight: '15 KG',
    carbon: 750,
  },
  {
    weight: '20 KG',
    carbon: 1000,
  },
];

const Pellets: NextPage = () => {
  const [selected, setSelected] = useState<any>(0);
  const [successHash, setSuccessHash] = useState<string>();
  const [loading, setLoading] = useState<boolean>(false);

  const { fetchAssets, carbon, wallet } = useContext(WalletContext);
  const { chainInfo, queryClient } = useContext(ChainContext);

  const affordable = PELLETS[selected]?.carbon <= countTokens(carbon?.tokens ?? []);

  useEffect(() => {
    fetchAssets();
  }, []);

  const handleSubmit = async () => {
    if (!affordable) return;
    try {
      setLoading(true);

      const trx = generateTransferTokenTrx({
        owner: wallet.user!?.address!,
        recipient: process.env.NEXT_PUBLIC_PELLET_ADDRESS ?? '',
        tokens: determineTokensSend(carbon?.tokens ?? [], PELLETS[selected]?.carbon),
      });

      let allowances = await queryAllowances(queryClient!, wallet.user!.address);

      const hash = await broadCastMessages(
        wallet,
        [trx],
        `SupaMoto: ${PELLETS[selected]?.weight} pellets`,
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
            <div className={utilsStyles.spacer7} />

            <div className={cls(styles.button, styles.original, affordable ? styles.enabled : styles.error)}>
              <ColoredIcon icon={PriceTagIcon} color={affordable ? ICON_COLOR.primary : ICON_COLOR.error} size={24} />
              <p>{PELLETS[selected]?.carbon} CARBON</p>
            </div>

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
                <ImageWithFallback
                  fallbackSrc='/images/chain-logos/fallback.png'
                  src='/images/steps/entity_check.png'
                  width={50}
                  height={50}
                  alt='check'
                />
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
