/**
 * 按日期对数组进行分组
 * @param items 要分组的数组
 * @param dateFormatter 日期格式化函数，接收时间戳返回日期字符串
 * @returns 按日期分组的对象，键为日期字符串，值为该日期的项目数组
 */
export function groupByDate<T extends { timestamp: number }>(
  items: T[],
  dateFormatter: (timestamp: number) => string
): Record<string, T[]> {
  return items.reduce(
    (groups, item) => {
      const date = dateFormatter(item.timestamp)
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(item)
      return groups
    },
    {} as Record<string, T[]>
  )
}
