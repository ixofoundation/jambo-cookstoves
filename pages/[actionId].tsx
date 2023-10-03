import { useState, useEffect, useContext } from 'react';
import type { GetStaticPaths, NextPage, GetStaticPropsResult, GetStaticPropsContext } from 'next';
import cls from 'classnames';

import utilsStyles from '@styles/utils.module.scss';
import styles from '@styles/stepsPages.module.scss';
import config from '@constants/config.json';
import { StepDataType, STEP, STEPS } from 'types/steps';
import EmptySteps from '@steps/EmptySteps';
import ReceiverAddress from '@steps/ReceiverAddress';
import DefineAmountToken from '@steps/DefineAmountToken';
import DefineAmountDelegate from '@steps/DefineAmountDelegate';
import ReviewAndSign from '@steps/ReviewAndSign';
import { backRoute, replaceRoute } from '@utils/router';
import { ACTION } from 'types/actions';
import ValidatorAddress from '@steps/ValidatorAddress';
import { WalletContext } from '@contexts/wallet';
import Head from '@components/Head/Head';
import { VALIDATOR_AMOUNT_CONFIGS, VALIDATOR_CONFIGS } from '@constants/validatorConfigs';
import ValidatorRewards from '@steps/ClaimRewards';
import { VALIDATOR_AMOUNT_CONFIG } from 'types/validators';
import Wallets from '@components/Wallets/Wallets';
import Footer from '@components/Footer/Footer';
import Header from '@components/Header/Header';
import LedgerDid from '@steps/LedgerDID';
import DidAssignEntity from '@steps/DidAssignEntity';
import Loader from '@components/Loader/Loader';
import ApproveEntityAuthz from '@steps/ApproveEntityAuthz';

type ActionPageProps = {
  actionData: ACTION;
};

const ActionExecution: NextPage<ActionPageProps> = ({ actionData }) => {
  const [count, setCount] = useState(0);
  const [action, setAction] = useState<ACTION | null>(null);
  const { wallet } = useContext(WalletContext);
  const signedIn = wallet.user?.address;

  useEffect(() => {
    setAction(actionData);
  }, [actionData]);

  function prepareOnNext<T>(stepId: STEPS) {
    return function handleOnNext(data: StepDataType<T>) {
      setAction((a) =>
        !a ? a : { ...a, steps: a.steps.map((step, index) => (index === count ? { ...step, data } : step)) },
      );
      if (count + 1 === action?.steps.length) return replaceRoute('/');
      setCount((c) => {
        const currentStepId = action?.steps[c].id;
        if (stepId === currentStepId) return c + 1;
        return c;
      });
    };
  }

  const handleBack = () => {
    if (count === 0) {
      const newActionData = JSON.parse(JSON.stringify(action));
      if (newActionData.steps.find((step: STEP) => step.id === STEPS.get_receiver_address)?.data?.data?.length > 1) {
        newActionData.steps.forEach((step: STEP, index: number) => {
          if (step.id === STEPS.select_token_and_amount || step.id === STEPS.get_receiver_address) {
            newActionData.steps[index].data.data.pop();
            newActionData.steps[index].data.currentIndex = newActionData.steps[index].data.data.length - 1;
          }
        });
        setAction(newActionData);
        return setCount(action?.steps.findIndex((step) => step.id === STEPS.bank_MsgMultiSend) as number);
      } else {
        return backRoute();
      }
    }
    setCount((c) => c - 1);
  };

  const handleNextMultiSend = (nextIndex: number = 0) => {
    const newActionData = JSON.parse(JSON.stringify(action));
    action!.steps!.forEach((step, index) => {
      if (step.id === STEPS.select_token_and_amount || step.id === STEPS.get_receiver_address)
        newActionData.steps[index].data.currentIndex = nextIndex;
    });
    setAction(newActionData);
    setCount((c) => c - 2);
  };

  const handleDeleteMultiSend = (deleteIndex: number = 0) => {
    const newActionData = JSON.parse(JSON.stringify(action));
    if (
      newActionData.steps.find(
        (step: STEP) => step.id === STEPS.select_token_and_amount || step.id === STEPS.get_receiver_address,
      )?.data?.data.length <= 1
    )
      return replaceRoute('/');
    newActionData.steps.forEach((step: STEP, index: number) => {
      if (step.id === STEPS.select_token_and_amount || step.id === STEPS.get_receiver_address) {
        newActionData.steps[index].data.data = [
          ...newActionData.steps[index].data.data.slice(0, deleteIndex),
          ...newActionData.steps[index].data.data.slice(deleteIndex + 1),
        ];
        newActionData.steps[index].data.currentIndex = newActionData.steps[index].data.data.length - 1;
      }
    });
    setAction(newActionData);
  };

  const getStepComponent = (step: STEP) => {
    switch (step?.id) {
      case STEPS.get_receiver_address:
        return (
          <ReceiverAddress
            onSuccess={prepareOnNext<STEPS.get_receiver_address>(step?.id as STEPS)}
            onBack={handleBack}
            data={
              (step.data as StepDataType<STEPS.get_receiver_address>) ?? {
                data: [],
                currentIndex: 0,
              }
            }
            header={action?.name}
          />
        );
      case STEPS.get_validator_delegate:
      case STEPS.get_delegated_validator_undelegate:
      case STEPS.get_delegated_validator_redelegate:
      case STEPS.get_validator_redelegate:
        return (
          <ValidatorAddress
            onSuccess={prepareOnNext<STEPS.get_validator_delegate>(step?.id as STEPS)}
            onBack={handleBack}
            data={step.data as StepDataType<STEPS.get_validator_delegate>}
            header={action?.name}
            config={VALIDATOR_CONFIGS[step.id] ?? VALIDATOR_CONFIGS.default}
            excludeValidators={
              step.id === STEPS.get_validator_redelegate
                ? (
                    action?.steps.find((step) => step.id === STEPS.get_delegated_validator_redelegate)
                      ?.data as StepDataType<STEPS.get_validator_delegate>
                  )?.validator?.address || []
                : []
            }
          />
        );
      case STEPS.select_token_and_amount:
        return (
          <DefineAmountToken
            onSuccess={prepareOnNext<STEPS.select_token_and_amount>(step?.id as STEPS)}
            onBack={handleBack}
            data={
              (step.data as StepDataType<STEPS.select_token_and_amount>) ?? {
                data: [],
                currentIndex: 0,
              }
            }
            header={action?.name}
          />
        );
      case STEPS.select_amount_delegate:
      case STEPS.select_amount_undelegate:
      case STEPS.select_amount_redelegate:
        return (
          <DefineAmountDelegate
            onSuccess={prepareOnNext<STEPS.select_amount_delegate>(step?.id as STEPS)}
            onBack={handleBack}
            data={step.data as StepDataType<STEPS.select_amount_delegate>}
            header={action?.name}
            config={(VALIDATOR_AMOUNT_CONFIGS[step.id] ?? VALIDATOR_AMOUNT_CONFIGS.default) as VALIDATOR_AMOUNT_CONFIG}
            validator={
              (
                action?.steps.find(
                  (step) =>
                    step.id === STEPS.get_validator_delegate ||
                    step.id === STEPS.get_delegated_validator_undelegate ||
                    step.id === STEPS.get_delegated_validator_redelegate,
                )?.data as StepDataType<STEPS.get_validator_delegate>
              )?.validator || null
            }
          />
        );
      case STEPS.distribution_MsgWithdrawDelegatorReward:
        return (
          <ValidatorRewards
            onSuccess={prepareOnNext<STEPS.review_and_sign>(step?.id as STEPS)}
            onBack={handleBack}
            data={step.data as StepDataType<STEPS.get_validator_delegate>}
            header={action?.name}
            message={step.id}
          />
        );
      case STEPS.bank_MsgSend:
      case STEPS.bank_MsgMultiSend:
      case STEPS.staking_MsgDelegate:
      case STEPS.staking_MsgUndelegate:
      case STEPS.staking_MsgRedelegate:
        return (
          <ReviewAndSign
            onSuccess={prepareOnNext<STEPS.review_and_sign>(step?.id as STEPS)}
            handleNextMultiSend={handleNextMultiSend}
            deleteMultiSend={handleDeleteMultiSend}
            onBack={handleBack}
            steps={action!.steps}
            header={action?.name}
            message={step.id}
          />
        );
      case STEPS.iid_MsgCreateIidDocument:
        return (
          <LedgerDid
            onSuccess={prepareOnNext<STEPS.iid_MsgCreateIidDocument>(step?.id as STEPS)}
            onBack={handleBack}
            header={action?.name}
            data={step.data as StepDataType<STEPS.iid_MsgCreateIidDocument>}
          />
        );
      case STEPS.did_assign_entity:
        return (
          <DidAssignEntity
            onSuccess={prepareOnNext<STEPS.did_assign_entity>(step?.id as STEPS)}
            onBack={handleBack}
            header={action?.name}
            // data={step.data as StepDataType<STEPS.did_assign_entity>}
          />
        );
      case STEPS.approve_entity_authz:
        return (
          <ApproveEntityAuthz
            onSuccess={prepareOnNext<STEPS.approve_entity_authz>(step?.id as STEPS)}
            onBack={handleBack}
            header={action?.name}
            data={
              action?.steps.find((step) => step.id === STEPS.did_assign_entity)
                ?.data as unknown as StepDataType<STEPS.did_assign_entity>
            }
          />
        );
      default:
        return <EmptySteps loading={true} />;
    }
  };

  return (
    <>
      <Head title={config.siteName} description={actionData.description} />

      {!signedIn ? (
        <>
          <Header />
          <main className={cls(utilsStyles.main, utilsStyles.columnJustifyCenter, styles.stepContainer)}>
            <div className={utilsStyles.spacer3} />
            <Wallets />
            <Footer onBackUrl='/' backLabel='Home' />
            <div className={utilsStyles.spacer3} />
          </main>
        </>
      ) : wallet?.walletType && !wallet?.user?.address ? (
        <>
          <Header />
          <main className={cls(utilsStyles.main, utilsStyles.columnCenter)}>
            <Loader size={30} />
          </main>
        </>
      ) : (action?.steps?.length ?? 0) < 1 ? (
        <EmptySteps />
      ) : (
        getStepComponent(action!.steps[count])
      )}
    </>
  );
};

export default ActionExecution;

type PathsParams = {
  actionId: string;
};

export const getStaticPaths: GetStaticPaths<PathsParams> = async () => {
  const paths = config.actions.map((a) => ({ params: { actionId: a.id } }));

  return {
    paths,
    fallback: false,
  };
};

export const getStaticProps = async ({
  params,
}: GetStaticPropsContext<PathsParams>): Promise<GetStaticPropsResult<ActionPageProps>> => {
  const actionData = config.actions.find((a) => params!.actionId == a.id);

  return {
    props: {
      actionData: actionData as ACTION,
    },
  };
};
