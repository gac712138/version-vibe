"use client";

import { createContext, useContext, ReactNode } from "react";

// 定義資料型別
type UserProjectData = {
  id: string; // project_member id
  project_id: string;
  role: string;
  display_name: string;
  avatar_url: string | null;
  projects: {
    id: string;
    name: string;
  };
};

type UserProjectsContextType = {
  memberships: UserProjectData[];
  currentProjectId: string | null; // 選擇性的：如果你想在這裡管理目前選中的專案
};

const UserProjectsContext = createContext<UserProjectsContextType | null>(null);

export function UserProjectsProvider({ 
  children, 
  data 
}: { 
  children: ReactNode; 
  data: UserProjectData[] 
}) {
  return (
    <UserProjectsContext.Provider value={{ memberships: data, currentProjectId: null }}>
      {children}
    </UserProjectsContext.Provider>
  );
}

// Custom Hook 方便取用
export function useUserProjects() {
  const context = useContext(UserProjectsContext);
  if (!context) {
    throw new Error("useUserProjects must be used within a UserProjectsProvider");
  }
  return context;
}