export const clearAllCustomerSessions = () => {
  try {
    localStorage.removeItem('customerSession');
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('customerSession:') || key.startsWith('customerSession_')) {
        localStorage.removeItem(key);
      }
    });
  } catch {
    // localStorage can fail in restricted browser contexts.
  }
};

