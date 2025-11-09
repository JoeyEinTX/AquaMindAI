/**
 * Centralized API Client for AquaMind Backend
 * 
 * This client provides a consistent interface for all HTTP requests
 * to the backend API with proper error handling and typing.
 * 
 * It automatically detects the backend port at runtime and syncs
 * with whatever port the server chooses (e.g., 3001 → 3002 if busy).
 */

// Backend configuration interface
interface BackendConfig {
  apiBaseUrl: string;
  wsBaseUrl: string;
  learningEnabled: boolean;
  port: number;
  networkIPs?: Array<{
    apiBaseUrl: string;
    wsBaseUrl: string;
  }>;
  timestamp: string;
}

// Configuration state
let backendConfig: BackendConfig | null = null;
let configFetchPromise: Promise<BackendConfig> | null = null;
let isInitialized = false;

// Fallback URLs from environment
const FALLBACK_API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
const CONFIG_CACHE_KEY = 'aquamind_backend_config';
const CONFIG_RETRY_DELAY = 2000; // 2 seconds
const MAX_CONFIG_RETRIES = 10;

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Try to load config from sessionStorage cache
 */
function loadCachedConfig(): BackendConfig | null {
  try {
    const cached = sessionStorage.getItem(CONFIG_CACHE_KEY);
    if (cached) {
      const config = JSON.parse(cached) as BackendConfig;
      // Check if cache is less than 5 minutes old
      const cacheAge = Date.now() - new Date(config.timestamp).getTime();
      if (cacheAge < 5 * 60 * 1000) {
        console.log('[CONFIG] Using cached backend configuration');
        return config;
      }
    }
  } catch (error) {
    console.warn('[CONFIG] Failed to load cached config:', error);
  }
  return null;
}

/**
 * Save config to sessionStorage cache
 */
function cacheConfig(config: BackendConfig): void {
  try {
    sessionStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(config));
  } catch (error) {
    console.warn('[CONFIG] Failed to cache config:', error);
  }
}

/**
 * Fetch backend configuration with retry logic
 */
async function fetchBackendConfig(retryCount = 0): Promise<BackendConfig> {
  // Try multiple potential base URLs
  const baseUrls = [
    FALLBACK_API_URL,
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
  ];

  for (const baseUrl of baseUrls) {
    try {
      const response = await fetch(`${baseUrl}/config`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(3000), // 3 second timeout
      });

      if (!response.ok) {
        continue; // Try next URL
      }

      const config: BackendConfig = await response.json();
      
      // Success! Cache and return
      cacheConfig(config);
      console.log(`[CONFIG] AquaMind connected to backend at ${config.apiBaseUrl}`);
      console.log(`[CONFIG] WebSocket available at ${config.wsBaseUrl}`);
      
      return config;
    } catch (error) {
      // Continue to next URL
      continue;
    }
  }

  // All URLs failed, retry if we haven't exceeded max retries
  if (retryCount < MAX_CONFIG_RETRIES) {
    console.warn(`[CONFIG] Failed to fetch backend config, retrying in ${CONFIG_RETRY_DELAY}ms... (attempt ${retryCount + 1}/${MAX_CONFIG_RETRIES})`);
    await new Promise(resolve => setTimeout(resolve, CONFIG_RETRY_DELAY));
    return fetchBackendConfig(retryCount + 1);
  }

  // Max retries exceeded, throw error
  throw new Error('Failed to connect to backend after multiple attempts. Please ensure the server is running.');
}

/**
 * Initialize backend configuration
 * This is called automatically on first API request
 */
async function initializeConfig(): Promise<BackendConfig> {
  // If already initialized, return cached config
  if (backendConfig) {
    return backendConfig;
  }

  // If initialization is in progress, wait for it
  if (configFetchPromise) {
    return configFetchPromise;
  }

  // Try to load from cache first
  const cached = loadCachedConfig();
  if (cached) {
    backendConfig = cached;
    isInitialized = true;
    return cached;
  }

  // Start fetching config
  console.log('[CONFIG] Initializing backend connection...');
  configFetchPromise = fetchBackendConfig();

  try {
    backendConfig = await configFetchPromise;
    isInitialized = true;
    return backendConfig;
  } finally {
    configFetchPromise = null;
  }
}

/**
 * Get the current API base URL
 */
export function getApiBaseUrl(): string {
  return backendConfig?.apiBaseUrl || FALLBACK_API_URL;
}

/**
 * Get the current WebSocket base URL
 */
export function getWsBaseUrl(): string {
  return backendConfig?.wsBaseUrl || (FALLBACK_API_URL.replace('http://', 'ws://').replace('https://', 'wss://'));
}

/**
 * Get the current backend configuration
 */
export function getBackendConfig(): BackendConfig | null {
  return backendConfig;
}

/**
 * Check if backend is initialized
 */
export function isBackendInitialized(): boolean {
  return isInitialized;
}

/**
 * Manually refresh backend configuration
 */
export async function refreshBackendConfig(): Promise<BackendConfig> {
  console.log('[CONFIG] Manually refreshing backend configuration...');
  backendConfig = null;
  isInitialized = false;
  return initializeConfig();
}

/**
 * Generic fetch wrapper with error handling and auto-initialization
 */
async function fetchWithErrorHandling<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  // Ensure config is initialized before making requests
  if (!isInitialized) {
    await initializeConfig();
  }

  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    // Parse response body
    const data = await response.json().catch(() => null);

    // Handle error responses
    if (!response.ok) {
      throw new ApiError(
        response.status,
        response.statusText,
        data?.message || `Request failed with status ${response.status}`
      );
    }

    return data as T;
  } catch (error) {
    // Re-throw ApiError as-is
    if (error instanceof ApiError) {
      throw error;
    }

    // Handle network errors - might indicate port changed
    if (error instanceof TypeError) {
      console.warn('[CONFIG] Network error detected, backend may have restarted on different port');
      // Try to refresh config on next request
      backendConfig = null;
      isInitialized = false;
      
      throw new ApiError(0, 'Network Error', 'Failed to connect to the backend. Attempting to reconnect...');
    }

    // Handle other errors
    throw new ApiError(500, 'Unknown Error', error instanceof Error ? error.message : 'An unknown error occurred');
  }
}

/**
 * API client with methods for all backend endpoints
 */
export const apiClient = {
  /**
   * Initialize connection to backend
   * Call this on app startup for faster initial requests
   */
  initialize: async (): Promise<void> => {
    try {
      await initializeConfig();
    } catch (error) {
      console.error('[CONFIG] Failed to initialize backend connection:', error);
      throw error;
    }
  },

  /**
   * GET request
   */
  get: <T>(endpoint: string, options?: RequestInit): Promise<T> => {
    return fetchWithErrorHandling<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  },

  /**
   * POST request
   */
  post: <T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> => {
    return fetchWithErrorHandling<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  /**
   * PUT request
   */
  put: <T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> => {
    return fetchWithErrorHandling<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  /**
   * DELETE request
   */
  delete: <T>(endpoint: string, options?: RequestInit): Promise<T> => {
    return fetchWithErrorHandling<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  },
};

export default apiClient;
