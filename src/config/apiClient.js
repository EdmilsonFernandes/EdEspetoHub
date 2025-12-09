const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000';

const defaultHeaders = {
  'Content-Type': 'application/json'
};

const handleResponse = async (response) => {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Erro na API');
  }
  return response.json();
};

export const apiClient = {
  get: async (path) => handleResponse(await fetch(`${API_BASE_URL}${path}`)),
  post: async (path, body) =>
    handleResponse(
      await fetch(`${API_BASE_URL}${path}`, {
        method: 'POST',
        headers: defaultHeaders,
        body: JSON.stringify(body)
      })
    ),
  put: async (path, body) =>
    handleResponse(
      await fetch(`${API_BASE_URL}${path}`, {
        method: 'PUT',
        headers: defaultHeaders,
        body: JSON.stringify(body)
      })
    ),
  patch: async (path, body) =>
    handleResponse(
      await fetch(`${API_BASE_URL}${path}`, {
        method: 'PATCH',
        headers: defaultHeaders,
        body: JSON.stringify(body)
      })
    ),
  delete: async (path) => handleResponse(await fetch(`${API_BASE_URL}${path}`, { method: 'DELETE' }))
};
