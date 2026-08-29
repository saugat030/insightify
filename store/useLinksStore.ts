import { create } from "zustand";
import axiosInstance from "@/lib/axiosInstance";

// Shared state for the saved-links list.
//
// The list (DashboardClient) and the things that mutate it (NewLinkForm,
// LinkCard) are sibling client components with no common client parent, so they
// can't share state through props. They previously called router.refresh(),
// which only re-renders Server Components — the list fetches inside a
// useEffect, so nothing re-ran and the UI went stale until a manual reload.
// Routing the mutations through this store keeps every consumer in sync.

export type LinkItem = {
  _id: string;
  url: string;
  title: string;
  imageUrl?: string;
  aiSummary: string[];
  aiTags: string[];
  category?: string;
  keyword?: string;
  aiExtraInfo?: string;
  createdAt: string;
};

interface LinksState {
  links: LinkItem[];
  isLoading: boolean;
  error: string | null;
  fetchLinks: () => Promise<void>;
  addLink: (link: LinkItem) => void;
  removeLink: (id: string) => void;
}

export const useLinksStore = create<LinksState>((set) => ({
  links: [],
  isLoading: true,
  error: null,

  fetchLinks: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await axiosInstance.get("/api/links");
      set({ links: res.data, isLoading: false });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Failed to fetch links.";
      set({ error: message, isLoading: false });
    }
  },

  // The API returns newest-first, so a freshly created link goes on top.
  addLink: (link) => set((state) => ({ links: [link, ...state.links] })),

  removeLink: (id) =>
    set((state) => ({ links: state.links.filter((l) => l._id !== id) })),
}));
