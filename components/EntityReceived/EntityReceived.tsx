import ImageWithFallback from '@components/ImageFallback/ImageFallback';

import utilsStyles from '@styles/utils.module.scss';
import styles from './EntityReceived.module.scss';
import RoundedCheck from '@icons/custom_rounded_check.svg';

type EntityReceivedProps = {
  entityName: string;
};

const EntityReceived = ({ entityName }: EntityReceivedProps) => {
  return (
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
          <RoundedCheck width={60} height={60} />
        </div>
      </div>
      <div className={utilsStyles.spacer3} />
      <p className={utilsStyles.centerText}>{entityName} received!</p>
      <div className={utilsStyles.spacer3} />
    </>
  );
};

export default EntityReceived;
