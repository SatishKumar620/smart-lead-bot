// A safe wrapper for localStorage that falls back to in-memory storage 
// if access is denied (e.g. inside cross-origin sandboxed iframes like Hugging Face Spaces).

let memoryStorage = {};

const storage = {
  getItem: (key) => {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      console.warn("Storage access blocked, using memory fallback.", e);
      return memoryStorage[key] || null;
    }
  },
  
  setItem: (key, value) => {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      console.warn("Storage access blocked, saving in memory.", e);
      memoryStorage[key] = String(value);
    }
  },
  
  removeItem: (key) => {
    try {
      window.localStorage.removeItem(key);
    } catch (e) {
      console.warn("Storage access blocked, removing from memory.", e);
      delete memoryStorage[key];
    }
  },
  
  clear: () => {
    try {
      window.localStorage.clear();
    } catch (e) {
      console.warn("Storage access blocked, clearing memory.", e);
      memoryStorage = {};
    }
  }
};

export default storage;
