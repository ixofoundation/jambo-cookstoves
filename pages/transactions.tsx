import { useContext, useEffect, useRef, useState } from 'react';
import type { NextPage } from 'next';
import cls from 'classnames';

import utilsStyles from '@styles/utils.module.scss';
import styles from '@styles/transactionsPage.module.scss';
import Header from '@components/Header/Header';
import Head from '@components/Head/Head';
import config from '@constants/config.json';
import { WalletContext } from '@contexts/wallet';
import Card from '@components/Card/Card';
import ColoredIcon, { ICON_COLOR } from '@components/ColoredIcon/ColoredIcon';
import ArrowLeftIcon from '@icons/arrow_left.svg';
import HistoryIcon from '@icons/history.svg';
import CookingPotIcon from '@icons/cooking_pot.svg';
import { backRoute } from '@utils/router';
import { getUserCarbonTransactionsByAddress } from '@utils/graphql';
import { ChainContext } from '@contexts/chain';
import { HistoricTransaction } from 'types/transactions';
import { veryShortAddress } from '@utils/wallets';
import Loader from '@components/Loader/Loader';
import NavigationCard from '@components/NavigationCard/NavigationCard';
import { timeAgo } from '@utils/misc';
import { countUserCarbon } from '@utils/entity';

const Transactions: NextPage = () => {
  const [transactions, setTransactions] = useState<HistoricTransaction[]>();

  const { graphqlClient } = useContext(ChainContext);
  const { wallet, carbon } = useContext(WalletContext);
  const fetching = useRef(false);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      if (fetching.current) return;
      if (!fetching.current) fetching.current = true;
      if (!graphqlClient) throw new Error('Missing graphql client');
      if (!wallet?.user?.address) throw new Error('Missing wallet address');
      const transactionsList = await getUserCarbonTransactionsByAddress(graphqlClient!, wallet.user!?.address);
      setTransactions(
        transactionsList.map(({ transactionByTransactionHash, ...t }: any) => ({
          ...t,
          time: transactionByTransactionHash.time,
        })),
      );
    } catch (error) {
      console.error(error);
      setTransactions([]);
    }
  };

  if (transactions === undefined)
    return (
      <>
        <Head title={config.siteName} description={config.siteName + ' dApp'} />

        <Header />

        <main className={cls(utilsStyles.main, utilsStyles.rowAlignCenter, utilsStyles.rowJustifyCenter)}>
          <Loader />
        </main>
      </>
    );

  return (
    <>
      <Head title={config.siteName} description={config.siteName + ' dApp'} />

      <Header />

      <main className={cls(utilsStyles.main)}>
        <NavigationCard label={`${countUserCarbon(carbon)} CARBON`} icon={ArrowLeftIcon} onClick={backRoute} />

        <div className={utilsStyles.spacer1} />
        <div className={cls(utilsStyles.rowJustifyCenter, utilsStyles.rowAlignCenter)}>
          <ColoredIcon icon={HistoryIcon} color={ICON_COLOR.white} size={24} />
          <h4 className={styles.historyTitle}>History</h4>
        </div>
        <div className={utilsStyles.spacer1} />

        {transactions?.map((transaction: any) => {
          const received = transaction.to === wallet.user!?.address;

          return (
            <Card key={transaction.id} className={styles.transactionCard}>
              <ColoredIcon icon={CookingPotIcon} color={ICON_COLOR.white} size={32} />
              <div className={styles.transactionContent}>
                <h5 className={styles.transactionCollection}>
                  {received ? `from: ${veryShortAddress(transaction.from)}` : `to: ${veryShortAddress(transaction.to)}`}
                </h5>
                <h4 className={styles.transactionName}>{timeAgo(new Date(transaction.time).getTime())}</h4>
              </div>
              <div className={styles.transactionStatusWrapper}>
                <p className={styles.transactionStatusLabel}>{received ? 'received' : 'sent'}</p>
                <p className={cls(styles.transactionStatus, received ? styles.activeStatus : styles.inactiveStatus)}>
                  {received ? '+' : '-'}{' '}
                  {transaction?.value?.tokens?.reduce((acc: number, t: any) => acc + Number(t.amount), 0)} CARBON
                </p>
              </div>
            </Card>
          );
        })}
      </main>
    </>
  );
};

export default Transactions;
