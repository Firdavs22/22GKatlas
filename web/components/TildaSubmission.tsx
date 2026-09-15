export type IntakeDetails = {
  provider: "tilda";
  childAge: string;
  contactMethod: "phone" | "telegram" | "vk" | "max";
  contactValue: string;
  visitDate: string;
  dataConsent: boolean | null;
  dataConsentRaw: string;
  marketingConsent: boolean | null;
  marketingConsentRaw: string;
  receivedAt: string;
};
export const contactLabels = {
  phone: "Телефон",
  telegram: "Telegram",
  vk: "VK",
  max: "Max",
};
export function leadContact(lead: {
  phone: string;
  intakeDetails?: IntakeDetails | null;
}) {
  const details = lead.intakeDetails;
  return details && details.contactMethod !== "phone" && details.contactValue
    ? contactLabels[details.contactMethod] + ": " + details.contactValue
    : lead.phone;
}
const consentText = (value: boolean | null, raw: string) =>
  value === true
    ? "Отмечено в форме"
    : value === false
      ? "Не отмечено"
      : raw
        ? "Ответ из формы: " + raw
        : "Сведения не переданы";
export default function TildaSubmission({
  details,
}: {
  details: IntakeDetails;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 my-4 text-sm space-y-2 break-words">
      <p className="font-medium">Данные из формы Tilda</p>
      <p>
        Предпочтительный способ связи:{" "}
        <strong>{contactLabels[details.contactMethod]}</strong>
      </p>
      <p className="break-words">Контакт: {details.contactValue}</p>
      {details.childAge && <p>Возраст ребёнка: {details.childAge}</p>}
      {details.visitDate && <p>Желаемая дата посещения: {details.visitDate}</p>}
      <p>
        Обработка персональных данных:{" "}
        {consentText(details.dataConsent, details.dataConsentRaw)}
      </p>
      <p>
        Рекламные сообщения:{" "}
        {consentText(details.marketingConsent, details.marketingConsentRaw)}
      </p>
      <p className="text-xs text-slate-500">
        Сохранены ответы при отправке формы. Дату рождения и начало посещения
        уточните перед зачислением.
      </p>
    </section>
  );
}
