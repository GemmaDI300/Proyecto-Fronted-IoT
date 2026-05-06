import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface ActivityEvent {
    id: string;
    action: "created" | "edited" | "deleted";
    entityType: string;
    entityName: string;
    timestamp: string;
}

const STORAGE_KEY = "iot_activity_log";
const MAX_EVENTS = 50;

interface ActivityContextType {
    events: ActivityEvent[];
    addEvent: (action: ActivityEvent["action"], entityType: string, entityName: string) => void;
    clearEvents: () => void;
}

const ActivityContext = createContext<ActivityContextType>({
    events: [],
    addEvent: () => {},
    clearEvents: () => {},
});

export function ActivityProvider({ children }: { children: ReactNode }) {
    const [events, setEvents] = useState<ActivityEvent[]>(() => {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        } catch {
            return [];
        }
    });

    const addEvent = useCallback(
        (action: ActivityEvent["action"], entityType: string, entityName: string) => {
            setEvents((prev) => {
                const updated = [
                    {
                        id: crypto.randomUUID(),
                        action,
                        entityType,
                        entityName,
                        timestamp: new Date().toISOString(),
                    },
                    ...prev,
                ].slice(0, MAX_EVENTS);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
                return updated;
            });
        },
        []
    );

    const clearEvents = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
        setEvents([]);
    }, []);

    return (
        <ActivityContext.Provider value={{ events, addEvent, clearEvents }}>
            {children}
        </ActivityContext.Provider>
    );
}

export function useActivity() {
    return useContext(ActivityContext);
}
