function browserStorage(): Storage {
  try {
    if (typeof window !== 'undefined') return window.localStorage;
  } catch {
    // Browsers can block site storage through privacy or security settings.
  }
  throw new Error('Browser storage is unavailable. Allow site data for this app and try again.');
}

export async function getItemAsync(key: string): Promise<string | null> {
  // Expo's static export runs without a browser or a saved user session.
  if (typeof window === 'undefined') return null;
  return browserStorage().getItem(key);
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  try {
    browserStorage().setItem(key, value);
  } catch {
    throw new Error('Unable to save your login. Allow site data or free up browser storage, then try again.');
  }
}

export async function deleteItemAsync(key: string): Promise<void> {
  if (typeof window === 'undefined') return;
  browserStorage().removeItem(key);
}
