export function backoffMs(attempt:number) {
  const base = 2000;
  return Math.min(5*60*1000, Math.pow(2, attempt-1)*base); // caps at 5 minutes
}
