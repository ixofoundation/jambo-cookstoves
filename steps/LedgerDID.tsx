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
import { queryAllowances, queryIidDocument } from '@utils/query';
import { defaultTrxFeeOption, generateCreateIidTrx } from '@utils/transactions';
import { broadCastMessages } from '@utils/wallets';
import { KEPLR_CHAIN_INFO_TYPE } from 'types/chain';
import { delay } from '@utils/misc';

type LedgerDidProps = {
  onSuccess: (data: StepDataType<STEPS.iid_MsgCreateIidDocument>) => void;
  onBack?: () => void;
  data?: StepDataType<STEPS.iid_MsgCreateIidDocument>;
  header?: string;
};

const LedgerDid: FC<LedgerDidProps> = ({ onSuccess, onBack, header }) => {
  const [step, setStep] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string>();

  const { wallet, updateWalletUserDid } = useContext(WalletContext);
  const { queryClient, chain, chainInfo } = useContext(ChainContext);

  useEffect(() => {
    if (wallet?.user?.did) {
      onSuccess({ did: wallet.user.did });
    } else if (wallet?.user?.pubKey) {
      checkDid();
    }
  }, [wallet?.user?.did]);

  const checkDid = async () => {
    try {
      if (wallet?.user?.did) return wallet.user.did;
      if (!wallet?.user?.pubKey) throw new Error('No public key found');
      const did = utils.did.generateSecpDid(wallet?.user?.pubKey);
      const didLedgered = queryClient ? await queryIidDocument(queryClient, did) : undefined;
      if (!didLedgered) throw new Error('No DID found');
      updateWalletUserDid(did);
      return did;
    } catch (error) {
      console.error('checkDid::', error);
      return undefined;
    }
  };

  const handleSubmit = async () => {
    try {
      const existingDid = await checkDid();
      if (!existingDid) {
        setStep('Checking if you have an allowance');
        let allowances = await queryAllowances(queryClient!, wallet.user!.address);

        if (!allowances?.allowances?.length) {
          setStep('Granting you an allowance');
          await axios
            .post('/api/feegrant/grantFeegrant', {
              address: wallet.user!.address,
              chainNetwork: chain.chainNetwork,
            })
            .catch(console.error);

          setStep('Checking if you have an allowance');
          allowances = await queryAllowances(queryClient!, wallet.user!.address);

          if (!allowances?.allowances?.length) throw new Error('Failed to grant feegrant');
        }

        setStep('Creating your ixo DID');

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

        setStep('Success!');
        await delay(900);

        updateWalletUserDid(existingDid!);
      }
    } catch (error) {
      setError((error as { message: string })?.message ?? 'An error occurred');
    } finally {
      setStep(undefined);
    }
  };

  return (
    <>
      <Header header={header} />

      <main className={cls(utilsStyles.main, utilsStyles.columnJustifyCenter, styles.stepContainer)}>
        {step ? (
          <>
            <Loader size={100} />
            <div className={utilsStyles.spacer3} />
            <p className={utilsStyles.centerText}>Connecting...</p>
            <div className={utilsStyles.spacer2} />
            <p className={styles.lightFinePrint}>{step}</p>
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
