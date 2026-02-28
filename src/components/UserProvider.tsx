"use client";

import * as React from "react";

export interface UserInfo {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
}

interface UserContextValue {
    user: UserInfo | null;
    loading: boolean;
    refresh: () => void;
}

const UserContext = React.createContext<UserContextValue>({
    user: null,
    loading: true,
    refresh: () => { },
});

export function useUser() {
    return React.useContext(UserContext);
}

export function UserProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = React.useState<UserInfo | null>(null);
    const [loading, setLoading] = React.useState(true);

    const fetchUser = React.useCallback(async () => {
        try {
            const res = await fetch("/api/auth/me");
            if (!res.ok) {
                setUser(null);
                return;
            }
            const data = (await res.json()) as { user: UserInfo | null };
            setUser(data.user);
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    const refresh = React.useCallback(() => {
        void fetchUser();
    }, [fetchUser]);

    return (
        <UserContext.Provider value={{ user, loading, refresh }}>
            {children}
        </UserContext.Provider>
    );
}
