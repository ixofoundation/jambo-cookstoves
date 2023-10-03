import { useContext } from 'react';
import type { NextPage } from 'next';
import cls from 'classnames';

import utilsStyles from '@styles/utils.module.scss';
import styles from '@styles/entitiesPage.module.scss';
import Header from '@components/Header/Header';
import Head from '@components/Head/Head';
import config from '@constants/config.json';
import { WalletContext } from '@contexts/wallet';
import Card from '@components/Card/Card';
import ColoredIcon, { ICON_COLOR } from '@components/ColoredIcon/ColoredIcon';
import ArrowLeftIcon from '@icons/arrow_left.svg';
import CookingPotIcon from '@icons/cooking_pot.svg';
import { backRoute } from '@utils/router';
import NavigationCard from '@components/NavigationCard/NavigationCard';
import { extractEntityName, extractEntityType } from '@utils/entity';

const Entities: NextPage = () => {
  const { entities } = useContext(WalletContext);

  return (
    <>
      <Head title={config.siteName} description={config.siteName + ' dApp'} />

      <Header />

      <main className={cls(utilsStyles.main)}>
        <NavigationCard
          label={`${entities.length} stove${entities.length > 1 ? 's' : ''}`}
          icon={ArrowLeftIcon}
          onClick={backRoute}
        />

        <div className={utilsStyles.spacer3} />

        {entities.map((entity) => (
          <Card key={entity.id} className={styles.entityCard}>
            <ColoredIcon icon={CookingPotIcon} color={ICON_COLOR.white} size={32} />
            <div className={styles.entityContent}>
              <h5 className={styles.entityCollection}>{extractEntityType(entity)}</h5>
              <h4 className={styles.entityName}>{extractEntityName(entity)}</h4>
            </div>
            <div className={styles.entityStatusWrapper}>
              <p className={styles.entityStatusLabel}>status</p>
              <p
                className={cls(
                  styles.entityStatus,
                  entity.userAuthz && entity.entityAuthz ? styles.activeStatus : styles.inactiveStatus,
                )}
              >
                {entity.userAuthz && entity.entityAuthz ? 'active' : 'inactive'}
              </p>
            </div>
          </Card>
        ))}
      </main>
    </>
  );
};

export default Entities;
