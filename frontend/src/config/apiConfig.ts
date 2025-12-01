const normalizeUrl = (url: string) => url.replace(/\/$/, '');

const ensureApiPath = (url: string | null | undefined) => {
  if (!url) return null;
  const normalized = normalizeUrl(url);
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
};

const resolveApiBaseUrl = () => {
  const envValue = import.meta.env.VITE_API_URL?.trim();
  if (envValue) {
    if (envValue.startsWith('http://') || envValue.startsWith('https://')) {
      return ensureApiPath(envValue);
    }

    if (envValue.startsWith('/')) {
      return ensureApiPath(envValue);
    }

    return ensureApiPath(`https://${envValue}`);
  }

  return '/api';
};

export const API_BASE_URL = resolveApiBaseUrl();
