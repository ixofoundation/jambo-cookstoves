import { Timestamp } from '@ixo/impactxclient-sdk/types/codegen/google/protobuf/timestamp';
import { utils } from '@ixo/impactxclient-sdk';

export const isFulfilled = <T>(p: PromiseSettledResult<T>): p is PromiseFulfilledResult<T> => p.status === 'fulfilled';

export const isRejected = <T>(p: PromiseSettledResult<T>): p is PromiseRejectedResult => p.status === 'rejected';

export const sumArray = (array: number[]): number => array.reduce((result, value) => result + value, 0);

export const validateUrl = (url: string) =>
  /^(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/g.test(
    url,
  );

type ErrorWithMessage = {
  message: string;
};

const isErrorWithMessage = (error: unknown): error is ErrorWithMessage => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
};

const toErrorWithMessage = (error: unknown): ErrorWithMessage => {
  if (isErrorWithMessage(error)) return error;
  try {
    return new Error(JSON.stringify(error));
  } catch {
    return new Error(String(error));
  }
};

export const getErrorMessage = (error: unknown) => toErrorWithMessage(error).message;

export const convertTimestampObjectToTimestamp = (timestamp: Timestamp): number | undefined => {
  try {
    const date = utils.proto.fromTimestamp(timestamp);
    return date?.getTime();
  } catch (error) {
    return undefined;
  }
};

/**
 * A "modern" sleep statement.
 *
 * @param ms The number of milliseconds to wait.
 */
export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const toJsonString = (obj: any) => JSON.stringify(obj, null, 2);

export function timeAgo(timestamp: number): string {
  const now = new Date().getTime();
  const diff = now - timestamp;

  // Define time intervals in milliseconds
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  if (diff < minute) {
    const seconds = Math.floor(diff / 1000);
    return seconds + (seconds === 1 ? ' sec ago' : ' secs ago');
  } else if (diff < hour) {
    const minutes = Math.floor(diff / minute);
    return minutes + (minutes === 1 ? ' min ago' : ' mins ago');
  } else if (diff < day) {
    const hours = Math.floor(diff / hour);
    return hours + (hours === 1 ? 'h ago' : 'hrs ago');
  } else if (diff < week) {
    const days = Math.floor(diff / day);
    return days + (days === 1 ? ' day ago' : ' days ago');
  } else {
    const date = new Date(timestamp);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayOfMonth = date.getDate();
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${dayOfMonth.toString().padStart(2, '0')} ${month} ${year}`;
  }
}

export const addMinutesToDate = (date: Date, minutes: number): Date => {
  const newDate = new Date(date);
  newDate.setMinutes(newDate.getMinutes() + minutes);
  return newDate;
};
