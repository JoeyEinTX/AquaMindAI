/**
 * Centralized API Client for AquaMind Backend
 * 
 * This client provides a consistent interface for all HTTP requests
 * to the backend API with proper error handling and typing.
 */

// Get the API base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

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
 * Generic fetch wrapper with error handling
 */
async function fetchWithErrorHandling<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
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

    // Handle network errors
    if (error instanceof TypeError) {
      throw new ApiError(0, 'Network Error', 'Failed to connect to the backend. Please ensure the server is running.');
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
