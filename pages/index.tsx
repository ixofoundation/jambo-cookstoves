import { useContext } from 'react';
import type { NextPage } from 'next';
import cls from 'classnames';

import utilsStyles from '@styles/utils.module.scss';
import CustomSwiper from '@components/Swiper/Swiper';
import Header from '@components/Header/Header';
import Footer from '@components/Footer/Footer';
import Head from '@components/Head/Head';
import config from '@constants/config.json';
import { ACTION } from 'types/actions';
import { WalletContext } from '@contexts/wallet';
import ColoredIcon, { ICON_COLOR } from '@components/ColoredIcon/ColoredIcon';
import WalletIcon from '@icons/wallet.svg';
import CookingPotIcon from '@icons/cooking_pot.svg';
import PelletBagsIcon from '@icons/pellet_bags.svg';
import SendArrowIcon from '@icons/send_arrow.svg';
import PiggyBankIcon from '@icons/piggy_bank.svg';
import CropsIcon from '@icons/crops.svg';
import { pushNewRoute } from '@utils/router';
import ActionCard from '@components/ActionCard/ActionCard';
import NavigationCard from '@components/NavigationCard/NavigationCard';
import ThumbsUpIcon from '@icons/thumbs_up.svg';
import { countUserCarbon } from '@utils/entity';

const Home: NextPage = () => {
  const { wallet, entities, carbon, fetchAssets } = useContext(WalletContext);

  if (!wallet?.user?.did || !entities?.some((e) => e.userAuthz && e.entityAuthz))
    return (
      <>
        <Head title={config.siteName} description={config.siteName + ' dApp'} />

        <Header />

        <main className={cls(utilsStyles.main, utilsStyles.columnJustifyCenter)}>
          <CustomSwiper actions={config.actions as ACTION[]} swiper />
        </main>

        <Footer>
          <div
            className={cls(utilsStyles.longButton)}
            onClick={() => {
              const actionId = config.actions[0].id;
              pushNewRoute(`/${actionId}`);
            }}
          >
            <ColoredIcon icon={ThumbsUpIcon} color={ICON_COLOR.bg} size={24} />
            <p>Join</p>
          </div>
        </Footer>
      </>
    );

  return (
    <>
      <Head title={config.siteName} description={config.siteName + ' dApp'} />

      <Header />

      <main className={cls(utilsStyles.main, utilsStyles.noFooter, utilsStyles.columnJustifyCenter)}>
        <NavigationCard
          label={`${entities.length} stove${entities.length > 1 ? 's' : ''}`}
          icon={CookingPotIcon}
          onClick={() => pushNewRoute('entities')}
        />
        <div className={utilsStyles.spacer1} />
        <NavigationCard
          label={`${countUserCarbon(carbon)} CARBON`}
          icon={WalletIcon}
          onClick={() => pushNewRoute('/transactions')}
          onLoad={fetchAssets}
        />

        <div className={utilsStyles.spacer3} />

        <div className={utilsStyles.homeRow}>
          <ActionCard label='PELLETS' icon={PelletBagsIcon} onClick={() => pushNewRoute('/pellets')} />
          <ActionCard label='SEND' icon={SendArrowIcon} disabled />
        </div>
        <div className={utilsStyles.homeRow}>
          <ActionCard label='SAVE' icon={PiggyBankIcon} disabled />
          <ActionCard label='INSURE' icon={CropsIcon} disabled />
        </div>
        <div className={utilsStyles.spacer1} />
      </main>
    </>
  );
};

export default Home;
