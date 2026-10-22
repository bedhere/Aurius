import { useId, useRef } from 'react';
import { useI18n } from '../i18n/LanguageContext';

export default function InstallmentPaymentEntry() {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  return (
    <>
      <button
        className="installment-entry"
        type="button"
        ref={buttonRef}
        aria-label={t('detail.installment.open')}
        aria-haspopup="dialog"
        onClick={() => dialogRef.current?.showModal()}
      >
        <img src="/brand/afterpay-logo.jpg" alt="Afterpay" width="110" height="40" />
      </button>
      <dialog
        className="installment-dialog"
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClose={() => buttonRef.current?.focus()}
      >
        <h2 id={titleId}>{t('detail.installment.title')}</h2>
        <p id={descriptionId}>{t('detail.installment.pending')}</p>
        <button className="btn btn-primary" type="button" onClick={() => dialogRef.current?.close()}>
          {t('detail.installment.close')}
        </button>
      </dialog>
    </>
  );
}
