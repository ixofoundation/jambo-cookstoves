import { ElementType } from 'react';

import styles from './NavigationCard.module.scss';
import Card from '@components/Card/Card';
import ColoredIcon, { ICON_COLOR } from '@components/ColoredIcon/ColoredIcon';
import VerticalDotsIcon from '@icons/vertical_dots.svg';

type NavigationCardProps = {
  label: string;
  icon: ElementType<any>;
  onClick?: () => void;
};

const NavigationCard = ({ label, icon, onClick = () => {} }: NavigationCardProps) => (
  <Card className={styles.card} onClick={onClick}>
    <ColoredIcon icon={icon} color={ICON_COLOR.primary} size={32} />
    <h3 className={styles.label}>{label}</h3>
    <ColoredIcon icon={VerticalDotsIcon} color={ICON_COLOR.white} size={32} />
  </Card>
);

export default NavigationCard;
