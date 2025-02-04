/**
 * @public 
 * @param ms - time in milliseconds to sleep
 */
export const sleep = async (ms = 2000) => new Promise((r) => setTimeout(r, ms));

