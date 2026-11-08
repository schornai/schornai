export function currentDateTime(timeZone = "UTC", now = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    dateStyle: "full",
    timeStyle: "long",
    hour12: false,
  });
  return {
    iso: now.toISOString(),
    timeZone,
    local: formatter.format(now),
    unixMilliseconds: now.getTime(),
  };
}
