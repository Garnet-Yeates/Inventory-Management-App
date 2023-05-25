export function currentTimeSeconds() {
    return Math.floor(Date.now() / 1000);
  }
  
export function minutesFromNow(minutes) {
    return currentTimeSeconds() + minutes * 60;
  }
  