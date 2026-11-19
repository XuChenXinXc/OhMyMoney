import { CurrencyCode, UserSubscription, formatMoney, getSubMonthlyUsd } from "./catalog";

export function downloadRenewalIcs(subs: UserSubscription[], currency: CurrencyCode): boolean {
  if (subs.length === 0) return false;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ohmymoney.money//AI Subscription Reminders//EN",
  ];

  subs.forEach((sub) => {
    const day = Math.min(28, Math.max(1, Number(sub.renewalDay) || 1));
    let target = new Date(year, month, day);
    if (target < now) target = new Date(year, month + 1, day);
    const dt =
      `${target.getFullYear()}` +
      `${String(target.getMonth() + 1).padStart(2, "0")}` +
      `${String(target.getDate()).padStart(2, "0")}`;

    lines.push(
      "BEGIN:VEVENT",
      `UID:${sub.id}-${dt}@ohmymoney.money`,
      `DTSTART;VALUE=DATE:${dt}`,
      `RRULE:FREQ=MONTHLY;BYMONTHDAY=${day}`,
      `SUMMARY:AI Renewal Check: ${sub.name} (${formatMoney(getSubMonthlyUsd(sub), currency)})`,
      `DESCRIPTION:ohmymoney.money reminder — review whether you still actively use ${sub.name} before auto-renewal.`,
      "END:VEVENT"
    );
  });

  lines.push("END:VCALENDAR");
  const blob = new Blob([lines.join("
")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ohmymoney-ai-renewals.ics";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}
