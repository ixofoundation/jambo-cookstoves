import { ElementType } from 'react';
import cls from 'classnames';

import styles from './ActionCard.module.scss';
import Card, { CARD_BG_COLOR } from '@components/Card/Card';
import ColoredIcon, { ICON_COLOR } from '@components/ColoredIcon/ColoredIcon';

type ActionCardProps = {
  label: string;
  icon: ElementType<any>;
  onClick?: () => void;
  disabled?: boolean;
};

const ActionCard = ({ label, icon, onClick = () => {}, disabled = false }: ActionCardProps) => (
  <Card
    className={cls(styles.card, disabled ? styles.inactive : styles.active)}
    bgColor={CARD_BG_COLOR.primary}
    onClick={disabled ? () => {} : onClick}
  >
    <ColoredIcon icon={icon} color={ICON_COLOR.white} size={72} />
    <h4 className={styles.label}>{label}</h4>
  </Card>
);

export default ActionCard;
