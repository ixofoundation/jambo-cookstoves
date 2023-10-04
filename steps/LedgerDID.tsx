import { FC, useState, useEffect, useContext } from 'react';
import { utils } from '@ixo/impactxclient-sdk';
import cls from 'classnames';
import axios from 'axios';

import utilsStyles from '@styles/utils.module.scss';
import styles from '@styles/stepsPages.module.scss';
import Header from '@components/Header/Header';
import Footer from '@components/Footer/Footer';
import { StepDataType, STEPS } from 'types/steps';
import { WalletContext } from '@contexts/wallet';
import user from '@icons/user.svg';
import ColoredIcon, { ICON_COLOR } from '@components/ColoredIcon/ColoredIcon';
import Loader from '@components/Loader/Loader';
import { ChainContext } from '@contexts/chain';
import { queryAllowances } from '@utils/query';
import { defaultTrxFeeOption, generateCreateIidTrx } from '@utils/transactions';
import { broadCastMessages } from '@utils/wallets';
import { KEPLR_CHAIN_INFO_TYPE } from 'types/chain';

type LedgerDidProps = {
  onSuccess: (data: StepDataType<STEPS.iid_MsgCreateIidDocument>) => void;
  onBack?: () => void;
  data?: StepDataType<STEPS.iid_MsgCreateIidDocument>;
  header?: string;
};

const LedgerDid: FC<LedgerDidProps> = ({ onSuccess, onBack, header }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>();

  const { wallet, updateWalletUserDid } = useContext(WalletContext);
  const { queryClient, chain, chainInfo } = useContext(ChainContext);

  useEffect(() => {
    if (wallet?.user?.did) onSuccess({ did: wallet.user.did });
  }, [wallet?.user?.did]);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      let allowances = await queryAllowances(queryClient!, wallet.user!.address);

      if (!allowances?.allowances?.length)
        await axios.post('/api/feegrant/grantFeegrant', {
          address: wallet.user!.address,
          chainNetwork: chain.chainNetwork,
        });

      allowances = await queryAllowances(queryClient!, wallet.user!.address);

      if (!allowances?.allowances?.length) throw new Error('Failed to grant feegrant');

      const did = utils.did.generateSecpDid(wallet.user!.pubKey);
      const trx = generateCreateIidTrx({
        did: did!,
        pubkey: wallet.user!.pubKey,
        address: wallet.user!.address,
      });
      const hash = await broadCastMessages(
        wallet,
        [trx],
        'Ledgering DID from JAMBO (Supamoto)',
        defaultTrxFeeOption,
        'uixo',
        chainInfo as KEPLR_CHAIN_INFO_TYPE,
        allowances?.allowances[0]?.granter ?? undefined,
      );

      if (!hash) throw new Error('Failed to ledger DID');

      updateWalletUserDid(did);
    } catch (error) {
      setError((error as { message: string })?.message ?? 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header header={header} />

      <main className={cls(utilsStyles.main, utilsStyles.columnJustifyCenter, styles.stepContainer)}>
        {loading ? (
          <>
            <div className={utilsStyles.spacer1} />
            <Loader size={100} />
            <div className={utilsStyles.spacer3} />
            <p className={utilsStyles.centerText}>Connecting...</p>
            <div className={utilsStyles.spacer3} />
          </>
        ) : (
          <>
            <div className={utilsStyles.spacer1} />
            <ColoredIcon icon={user} color={ICON_COLOR.primary} size={100} />
            <div className={utilsStyles.spacer3} />
            <p className={utilsStyles.centerText}>Connect</p>
            {!!error && (
              <>
                <div className={utilsStyles.spacer1} />
                <p className={utilsStyles.errorText}>{error}</p>
              </>
            )}
            <div className={utilsStyles.spacer3} />
          </>
        )}
      </main>

      <Footer onBack={onBack} onBackUrl={onBack ? undefined : ''} onForward={() => handleSubmit()} />
    </>
  );
};

export default LedgerDid;
