const storageProvider = () => {
  if (typeof window === "undefined") return null;
  if (window.storage && typeof window.storage.get === "function" && typeof window.storage.set === "function") {
    return window.storage;
  }
  return null;
};

const parseAnyJson = (value) => {
  if (value == null) return null;
  if (typeof value === "string") {
    try { return JSON.parse(value); } catch { return null; }
  }
  if (typeof value === "object") {
    if (typeof value.value === "string") {
      try { return JSON.parse(value.value); } catch { return null; }
    }
    // Some providers already return parsed objects.
    return value;
  }
  return null;
};

export const stGet = async (key) => {
  try {
    const provider = storageProvider();

    if (provider) {
      const result = await provider.get(key);
      const parsed = parseAnyJson(result);
      if (parsed !== null) return parsed;
    }

    if (typeof window !== "undefined") {
      const raw = window.localStorage.getItem(key);
      return parseAnyJson(raw);
    }

    return null;
  } catch {
    try {
      if (typeof window !== "undefined") {
        const raw = window.localStorage.getItem(key);
        return parseAnyJson(raw);
      }
    } catch {
      // ignore secondary fallback failure
    }
    return null;
  }
};

export const stSet = async (key, value) => {
  const payload = JSON.stringify(value);
  try {
    const provider = storageProvider();

    if (provider) {
      // Support providers expecting either a string payload or wrapped object.
      try {
        await provider.set(key, payload);
      } catch {
        await provider.set(key, { value: payload });
      }
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem(key, payload);
    }
  } catch (error) {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, payload);
        return;
      }
    } catch {
      // ignore
    }
    console.error(error);
  }
};
