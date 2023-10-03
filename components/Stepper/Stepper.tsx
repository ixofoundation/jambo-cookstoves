import ColoredIcon, { ICON_COLOR } from '@components/ColoredIcon/ColoredIcon';
import { ElementType, useEffect, useState } from 'react';

import styles from './Stepper.module.scss';
import MinusIcon from '@icons/minus.svg';
import PlusIcon from '@icons/plus.svg';

type StepperProps = {
  steps: string[] | number[];
  currentIndex?: number;
  prefixIcon?: ElementType<any>;
  onChange: (step: string | number) => void;
};

const Stepper = ({ steps, currentIndex, prefixIcon, onChange }: StepperProps) => {
  const [index, setIndex] = useState<number>(
    currentIndex ? (currentIndex > steps.length - 1 ? steps.length - 1 : currentIndex < 0 ? 0 : currentIndex) : 0,
  );

  useEffect(() => {
    if (currentIndex !== index) onChange(index);
  }, [index]);

  const incrementStep = () => setIndex((prevState) => (prevState === steps.length - 1 ? prevState : prevState + 1));
  const decrementStep = () => setIndex((prevState) => (prevState === 0 ? prevState : prevState - 1));

  return (
    <div className={styles.wrapper}>
      <div className={styles.stepperButton} onClick={decrementStep}>
        <ColoredIcon icon={MinusIcon} color={ICON_COLOR.white} size={24} />
      </div>
      <div className={styles.step}>
        {!!prefixIcon && (
          <div className={styles.prefixIcon}>
            <ColoredIcon icon={prefixIcon} color={ICON_COLOR.primary} size={26} />
          </div>
        )}
        <p className={styles.stepLabel}>{steps[index]}</p>
      </div>
      <div className={styles.stepperButton} onClick={incrementStep}>
        <ColoredIcon icon={PlusIcon} color={ICON_COLOR.white} size={24} />
      </div>
    </div>
  );
};

export default Stepper;
