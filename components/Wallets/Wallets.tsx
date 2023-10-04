import { HTMLAttributes, useContext, useState } from 'react';
import cls from 'classnames';

import utilsStyles from '@styles/utils.module.scss';
import styles from './Wallets.module.scss';
import ColoredIcon, { ICON_COLOR } from '@components/ColoredIcon/ColoredIcon';
import WalletCard from '@components/CardWallet/CardWallet';
import WalletImg from '@icons/wallet.svg';
import { getOpera } from '@utils/opera';
import { getKeplr } from '@utils/keplr';
import { WALLETS } from '@constants/wallet';
import { WALLET_TYPE } from 'types/wallet';
import { WalletContext } from '@contexts/wallet';

type WalletsProps = {} & HTMLAttributes<HTMLDivElement>;

const Wallets = ({ className, ...other }: WalletsProps) => {
  const [selectedWallet, setSelectedWallet] = useState<WALLET_TYPE | null>(null);

  const keplrWallet = getKeplr();
  const operaWallet = getOpera();

  const { updateWalletType } = useContext(WalletContext);

  const handleOnSelect = (type: WALLET_TYPE) => () => {
    setSelectedWallet(type);
    setTimeout(() => updateWalletType(type), 1000);
  };

  return (
    <div className={cls(styles.wallets, className)} {...other}>
      {operaWallet || keplrWallet ? (
        <>
          <div className={utilsStyles.spacer3} />
          <h3>Choose your wallet</h3>
          <div className={utilsStyles.spacer3} />
          {!!keplrWallet && (
            <WalletCard
              name={WALLETS.keplr.name}
              img={WALLETS.keplr.img}
              onClick={handleOnSelect(WALLET_TYPE.keplr)}
              selected={selectedWallet === WALLET_TYPE.keplr}
            />
          )}
          {!!operaWallet && (
            <WalletCard
              name={WALLETS.opera.name}
              img={WALLETS.opera.img}
              onClick={handleOnSelect(WALLET_TYPE.opera)}
              selected={selectedWallet === WALLET_TYPE.opera}
            />
          )}
        </>
      ) : (
        <>
          <div className={utilsStyles.spacer3} />
          <div className={utilsStyles.rowJustifyCenter}>
            <ColoredIcon icon={WalletImg} size={58} color={ICON_COLOR.lightGrey} />
          </div>
          <div className={utilsStyles.spacer1} />
          <h3>No Wallet Detected</h3>
          <div className={utilsStyles.spacer2} />
          <p>This app works best in an Opera mobile browser on Android</p>
        </>
      )}
    </div>
  );
};

export default Wallets;
