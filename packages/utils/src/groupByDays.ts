export function getTimeGroups(startOfToday: Date) {
  const startOfTodayTime = startOfToday.getTime();

  const sevenDaysAgo = new Date(startOfToday);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoTime = sevenDaysAgo.getTime();

  const thirtyDaysAgo = new Date(startOfToday);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoTime = thirtyDaysAgo.getTime();
  return { sevenDaysAgoTime, startOfTodayTime, thirtyDaysAgoTime };
}

export function groupByDays<T>(items: T[], selector: (item: T) => Date) {
  const now = new Date();

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const { startOfTodayTime, sevenDaysAgoTime, thirtyDaysAgoTime } =
    getTimeGroups(startOfToday);

  const today: T[] = [];
  const last7Days: T[] = [];
  const last30Days: T[] = [];

  for (const item of items) {
    const updatedAt = selector(item).getTime();

    if (updatedAt >= startOfTodayTime) {
      today.push(item);
    } else if (updatedAt >= sevenDaysAgoTime) {
      last7Days.push(item);
    } else if (updatedAt >= thirtyDaysAgoTime) {
      last30Days.push(item);
    }
  }

  return {
    last30Days,
    last7Days,
    today,
  };
}
