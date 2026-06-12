import { create } from "zustand";

interface NetworkState {
  isOffline: boolean;
  setOffline: (status: boolean) => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  isOffline: false,
  setOffline: (status) => set({ isOffline: status }),
}));
