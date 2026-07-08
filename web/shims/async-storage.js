/**
 * Browser shim for @react-native-async-storage/async-storage
 * minimal no-op async-storage to satisfy packages bundling for web.
 */
const AsyncStorage = {
  getItem: async (k) => null,
  setItem: async (k, v) => undefined,
  removeItem: async (k) => undefined,
  clear: async () => undefined,
};
module.exports = AsyncStorage;
