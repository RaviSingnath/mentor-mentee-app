import dayjs from "dayjs";

export function formatDateTime(isoString: string): string {
  return dayjs(isoString).format("DD MMM YYYY [at] h:mm A");
}

export function formatDate(isoString: string): string {
  return dayjs(isoString).format("MMM DD, YYYY");
}
