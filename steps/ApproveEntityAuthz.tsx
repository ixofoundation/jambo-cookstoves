import { FC, useContext, useState } from 'react';
import { cosmos, utils } from '@ixo/impactxclient-sdk';
import cls from 'classnames';

import utilsStyles from '@styles/utils.module.scss';
import styles from '@styles/stepsPages.module.scss';
import Header from '@components/Header/Header';
import Footer from '@components/Footer/Footer';
import { StepDataType, STEPS } from 'types/steps';
import { WalletContext } from '@contexts/wallet';
import {
  defaultTrxFeeOption,
  generateAuthzGrantTrx,
  generateGenericAuthorizationTrx,
  generateGrantEntityAccountAuthzTrx,
} from '@utils/transactions';
import { broadCastMessages } from '@utils/wallets';
import { KEPLR_CHAIN_INFO_TYPE } from 'types/chain';
import { ChainContext } from '@contexts/chain';
import ImageWithFallback from '@components/ImageFallback/ImageFallback';
import Loader from '@components/Loader/Loader';
import { extractEntityName } from '@utils/entity';
import { backRoute } from '@utils/router';
import { queryAllowances } from '@utils/query';
import RoundedPayment from '@icons/custom_rounded_payment.svg';
import { addYearsToDate } from '@utils/misc';
import config from '@constants/config.json';

type ApproveEntityAuthzProps = {
  onSuccess: (data: StepDataType<STEPS.approve_entity_authz>) => void;
  onBack?: () => void;
  data: StepDataType<STEPS.did_assign_entity>;
  header?: string;
};

const ApproveEntityAuthz: FC<ApproveEntityAuthzProps> = ({ onSuccess, header, data }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>();

  const { wallet, fetchEntities, entities } = useContext(WalletContext);
  const { chainInfo, queryClient } = useContext(ChainContext);

  const entity = entities.find((e) => e.id === data.entityDid);
  const entityActive = entity?.userAuthz && entity?.entityAuthz;

  const handleSubmit = async () => {
    if (entityActive) return onSuccess({ done: true });
    if (!entities.length) return;
    try {
      setLoading(true);

      const msgs = [
        generateAuthzGrantTrx({
          granter: wallet.user!.address!,
          grantee: process.env.NEXT_PUBLIC_AUTHZ_ADDRESS ?? '',
          grant: cosmos.authz.v1beta1.Grant.fromPartial({
            authorization: generateGenericAuthorizationTrx(
              {
                msg: '/ixo.entity.v1beta1.MsgTransferEntity',
              },
              true,
            ) as { typeUrl: string; value: Uint8Array },
          }),
        }),
        generateAuthzGrantTrx({
          granter: wallet.user!.address!,
          grantee: process.env.NEXT_PUBLIC_AUTHZ_ADDRESS ?? '',
          grant: cosmos.authz.v1beta1.Grant.fromPartial({
            authorization: generateGenericAuthorizationTrx(
              {
                msg: '/ixo.token.v1beta1.MsgTransferToken',
              },
              true,
            ) as { typeUrl: string; value: Uint8Array },
          }),
        }),
        generateGrantEntityAccountAuthzTrx({
          entityDid: entities[0]?.id!,
          owner: wallet.user!.address!,
          name: 'admin',
          granteeAddress: process.env.NEXT_PUBLIC_AUTHZ_ADDRESS ?? '',
          grant: cosmos.authz.v1beta1.Grant.fromPartial({
            authorization: generateGenericAuthorizationTrx(
              {
                msg: '/ixo.token.v1beta1.MsgTransferToken',
              },
              true,
            ) as { typeUrl: string; value: Uint8Array },
            expiration: utils.proto.toTimestamp(addYearsToDate(new Date(), 100)),
          }),
        }),
      ];

      let allowances = await queryAllowances(queryClient!, wallet.user!.address);

      const hash = await broadCastMessages(
        wallet,
        msgs,
        'Granting SupaMoto access to your account',
        defaultTrxFeeOption,
        'uixo',
        chainInfo as KEPLR_CHAIN_INFO_TYPE,
        allowances?.allowances[0]?.granter ?? undefined,
      );

      if (!hash) throw new Error('Failed to authorise SupaMoto to issue CARBON credits');

      await fetchEntities();
    } catch (error) {
      console.error('DidAssignEntity::handleSubmit', error);
      setError((error as { message: string })?.message ?? 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header header={config.siteName} />

      <main className={cls(utilsStyles.main, utilsStyles.columnJustifyCenter, styles.stepContainer)}>
        {!entity ? (
          <>
            <h3 className={utilsStyles.errorText}>Something went wrong - cannot find device</h3>
          </>
        ) : !loading ? (
          <>
            <div className={utilsStyles.spacer1} />
            <div className={styles.relativeContainer}>
              <ImageWithFallback
                src='/images/steps/stove_entity.png'
                alt='stove icon'
                fallbackSrc='/images/chain-logos/fallback.png'
                width={143}
                height={168}
              />
              <div className={styles.subIcon}>
                <RoundedPayment width={60} height={60} />
              </div>
            </div>
            <div className={utilsStyles.spacer2} />
            <p className={utilsStyles.centerText}>{extractEntityName(entity)}</p>
            <div className={utilsStyles.spacer1} />
            <p className={entityActive ? utilsStyles.successText : utilsStyles.errorText}>
              {entityActive ? 'active' : 'inactive'}
            </p>
            <div className={utilsStyles.spacer3} />
            <p className={utilsStyles.centerText}>{entityActive ? 'Earning CARBON' : 'Earn CARBON?'}</p>
            {!entityActive && (
              <>
                <div className={utilsStyles.spacer2} />
                <p className={styles.finePrint}>
                  This will authorize SupaMoto to withdraw CARBON from the Impact Asset to pay for the cooking stove, in
                  accordance with your contractual agreement.
                </p>
              </>
            )}
            {!entityActive && !!error && (
              <>
                <div className={utilsStyles.spacer1} />
                <p className={utilsStyles.errorText}>{error}</p>
              </>
            )}
            <div className={utilsStyles.spacer3} />
          </>
        ) : (
          <>
            <div className={utilsStyles.spacer1} />
            <Loader size={100} />
            <div className={utilsStyles.spacer3} />
          </>
        )}
      </main>

      <Footer onBack={!entityActive ? backRoute : undefined} onForward={() => handleSubmit()} />
    </>
  );
};

export default ApproveEntityAuthz;
