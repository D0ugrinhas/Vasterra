const storageProvider = () => {
  if (typeof window === "undefined") return null;

  if (window.storage && typeof window.storage.get === "function" && typeof window.storage.set === "function") {
    return window.storage;
  }

  return {
    async get(key) {
      const value = window.localStorage.getItem(key);
      return value == null ? null : { value };
    },
    async set(key, value) {
      window.localStorage.setItem(key, value);
    },
  };
};

export const stGet = async (key) => {
  try {
    const provider = storageProvider();
    if (!provider) return null;
    const result = await provider.get(key);
    return result ? JSON.parse(result.value) : null;
  } catch {
    return null;
  }
};

export const stSet = async (key, value) => {
  try {
    const provider = storageProvider();
    if (!provider) return;
    await provider.set(key, JSON.stringify(value));
  } catch (error) {
    console.error(error);
  }
};
