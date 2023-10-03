import { HTMLAttributes } from 'react';
import cls from 'classnames';

import styles from './CardWallet.module.scss';
import Card from '@components/Card/Card';
import ImageWithFallback from '@components/ImageFallback/ImageFallback';

type WalletCardProps = {
  img?: string;
  Img?: any;
  name?: string;
  imgWidth?: number;
  imgHeight?: number;
  selected?: boolean;
} & HTMLAttributes<HTMLDivElement>;

export const WalletCard = ({
  children,
  className,
  img,
  Img,
  name,
  imgWidth = 40,
  imgHeight = 40,
  selected = false,
  ...other
}: WalletCardProps) => {
  return (
    // @ts-ignore
    <Card className={cls(styles.walletCard, className, selected ? styles.selected : styles.unselected)} {...other}>
      {Img ? (
        <Img width={imgWidth} height={imgHeight} />
      ) : img ? (
        <ImageWithFallback
          src={img}
          alt={name}
          width={imgWidth}
          height={imgHeight}
          fallbackSrc='/images/wallets/fallback.png'
        />
      ) : (
        <div />
      )}
      {!!name && <p>{name}</p>}
    </Card>
  );
};

export default WalletCard;

// TODO: remove @ts-ignore
