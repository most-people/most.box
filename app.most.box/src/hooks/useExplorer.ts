"use client";

import { useState, useMemo, useEffect } from "react";
import { useUserStore, FileItem, NoteItem } from "@/stores/userStore";
import mp from "@/utils/mp";

interface ExplorerResult<T> {
  items: T[];
  currentPath: string;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  filteredItems: T[];
  displayedItems: T[];
  hasMore: boolean;
  loadMore: () => void;
  handleFolderClick: (folderName: string) => void;
  handleBreadcrumbClick: (index: number) => void;
}

function useExplorer<T extends FileItem | NoteItem>(
  type: "files" | "notes",
): ExplorerResult<T> {
  const items = useUserStore((state) =>
    type === "files" ? state.files : state.notes,
  ) as T[];
  const currentPath = useUserStore((state) =>
    type === "files" ? state.filesPath : state.notesPath,
  );
  const setItem = useUserStore((state) => state.setItem);
  const pathKey = type === "files" ? "filesPath" : "notesPath";

  const [searchQuery, setSearchQuery] = useState("");
  const [displayCount, setDisplayCount] = useState(100);

  const filteredItems = useMemo(() => {
    return mp.filterFilesByPath(items, currentPath, searchQuery);
  }, [items, currentPath, searchQuery]);

  const displayedItems = useMemo(() => {
    return filteredItems.slice(0, displayCount);
  }, [filteredItems, displayCount]);

  const hasMore = filteredItems.length > displayCount;

  const loadMore = () => setDisplayCount((prev) => prev + 100);

  const handleFolderClick = (folderName: string) => {
    const newPath = currentPath ? `${currentPath}/${folderName}` : folderName;
    setItem(pathKey, newPath);
  };

  const handleBreadcrumbClick = (index: number) => {
    const parts = (currentPath || "").split("/").filter(Boolean);
    if (index < 0) {
      setItem(pathKey, "");
    } else {
      const newPath = parts.slice(0, index + 1).join("/");
      setItem(pathKey, newPath);
    }
  };

  useEffect(() => {
    setDisplayCount(100);
  }, [searchQuery, currentPath]);

  return {
    items,
    currentPath,
    searchQuery,
    setSearchQuery,
    filteredItems,
    displayedItems,
    hasMore,
    loadMore,
    handleFolderClick,
    handleBreadcrumbClick,
  };
}

export const useFileExplorer = () => {
  return useExplorer<FileItem>("files");
};

export const useNoteExplorer = () => {
  return useExplorer<NoteItem>("notes");
};
