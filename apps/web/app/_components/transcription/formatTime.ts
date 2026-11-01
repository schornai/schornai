// The project's TypeScript lib does not include Intl.DurationFormat yet.
type DurationFormatter = {
  format(duration: { hours: number; minutes: number; seconds: number }): string;
};
const { DurationFormat } = Intl as typeof Intl & {
  DurationFormat: new (
    locale: string,
    options: { style: "digital"; hoursDisplay: "auto" },
  ) => DurationFormatter;
};
const formatters = new Map<string, DurationFormatter>();

export function formatTime(value: number, locale: string): string {
  let formatter = formatters.get(locale);
  if (!formatter) {
    formatter = new DurationFormat(locale, {
      style: "digital",
      hoursDisplay: "auto",
    });
    formatters.set(locale, formatter);
  }
  const seconds = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  return formatter.format({
    hours: Math.floor(seconds / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
  });
}
