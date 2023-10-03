import { FC, useEffect, useContext, useRef, useState } from 'react';
import CopyToClipboard from 'react-copy-to-clipboard';
import QRCode from 'react-qr-code';
import cls from 'classnames';

import utilsStyles from '@styles/utils.module.scss';
import styles from '@styles/stepsPages.module.scss';
import Header from '@components/Header/Header';
import Footer from '@components/Footer/Footer';
import { StepDataType, STEPS } from 'types/steps';
import { WalletContext } from '@contexts/wallet';
import { delay } from '@utils/misc';
import EntityReceived from '@components/EntityReceived/EntityReceived';
import { extractEntityName } from '@utils/entity';
import ColoredIcon, { ICON_COLOR } from '@components/ColoredIcon/ColoredIcon';
import QRIcon from '@icons/qr_code.svg';
import { backRoute } from '@utils/router';

type DidAssignEntityProps = {
  onSuccess: (data: StepDataType<STEPS.did_assign_entity>) => void;
  onBack?: () => void;
  data?: StepDataType<STEPS.did_assign_entity>;
  header?: string;
};

const DidAssignEntity: FC<DidAssignEntityProps> = ({ onSuccess, header }) => {
  const [copied, setCopied] = useState(false);
  const polling = useRef<boolean>(false);

  const { wallet, updateEntities, entities } = useContext(WalletContext);

  const entity = entities.find((e) => !e.userAuthz || !e.entityAuthz);

  useEffect(() => {
    if (!entities?.length && !polling.current) pollForEntities();
  }, []);

  const pollForEntities = async () => {
    if (!polling.current) polling.current = true;
    await delay(5000);
    if (entities?.length) return;
    try {
      const devices = await updateEntities();
      if (!devices.length) throw new Error('No devices found');
      return;
    } catch (error) {
      await pollForEntities();
    }
  };

  const handleSubmit = async () => {
    if (!entity) return;
    onSuccess({ entityDid: entity?.id });
  };

  const onCopy = () => {
    if (copied) return;
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 1500);
  };

  return (
    <>
      <Header header={header} />

      <main className={cls(utilsStyles.main, utilsStyles.columnJustifyCenter, styles.stepContainer)}>
        {!entities?.length ? (
          <>
            <div className={utilsStyles.spacer1} />
            <p className={utilsStyles.centerText}>Supa Connected :)</p>
            <div className={utilsStyles.spacer3} />
            <p className={utilsStyles.centerText}>Please show this QR to your SupaMoto agent</p>
            <div className={utilsStyles.spacer3} />
            <div className={cls(utilsStyles.columnCenter, styles.qrWrapper)}>
              <QRCode value={wallet?.user?.did ?? ''} size={150} />
            </div>
            <div className={utilsStyles.spacer3} />
            <Footer>
              <CopyToClipboard text={wallet.user!?.did ?? ''} onCopy={onCopy}>
                <div className={cls(utilsStyles.longButton)} onClick={() => {}}>
                  <ColoredIcon icon={QRIcon} color={ICON_COLOR.bg} size={24} />
                  <p>{copied ? 'Copied' : 'Copy'}</p>
                </div>
              </CopyToClipboard>
            </Footer>
          </>
        ) : (
          <>
            <EntityReceived entityName={extractEntityName(entity!)} />
            <Footer onForward={() => handleSubmit()} />
          </>
        )}
      </main>
    </>
  );
};

export default DidAssignEntity;
