export interface AuditDetails {
    USER: {
        INITIATE_REGISTRATION: {
            email: string;
        }
        COMPLETE_REGISTRATION: {
            email: string;
            username: string;
            preferences: {
                price_weight: number;
                duration_weight: number;
                stops_weight: number;
                airline_quality_weight: number;
            }
        }
        FAILED_INITIATE_REGISTRATION: {
            email: string;
            reason: string;
        }
        FAILED_COMPLETE_REGISTRATION: {
            email: string;
            reason: string;
            subReason?: string;
        }
        UPDATE: {
            username?: string;
            public?: boolean;
            role?: string;
            userId?: string;
            preferences?: {
                price_weight?: number;
                duration_weight?: number;
                stops_weight?: number;
                airline_quality_weight?: number;
            }
        }
        FAILED_UPDATE: {
            userId: string;
            username?: string;
            reason: string;
        }
        UPDATE_PROFILE_PICTURE: {
            url: string;
        }
        DELETE: {
            id: string;
        }
        INITIATE_EMAIL_CHANGE: {
            newEmail: string;
        }
        COMPLETE_EMAIL_CHANGE: {
            oldEmail: string;
            newEmail: string;
        }
        CANCEL_EMAIL_CHANGE: {
            stayingEmail: string;
        }
        FAILED_INITIATE_EMAIL_CHANGE: {
            userId: string;
            newEmail: string;
            reason: string;
        }
        FAILED_COMPLETE_EMAIL_CHANGE: {
            userId: string;
            reason: string;
        }
        SEND_FRIEND_REQUEST: {
            userId: string;
        }
        CANCEL_FRIEND_REQUEST: {
            userId: string;
        }
        ACCEPT_FRIEND_REQUEST: {
            userId: string;
        }
        REJECT_FRIEND_REQUEST: {
            userId: string;
        }
        REMOVE_FRIEND: {
            userId: string;
        }
    }
    AUTH: {
        LOGIN: {
            identifier: string;
        }
        LOGIN_GOOGLE: {
            email: string;
        }
        FAILED_LOGIN: {
            identifier: string;
            reason: string;
        }
        FAILED_LOGIN_GOOGLE: {
            email?: string;
            reason: string;
            details?: string;
        }
        AUTO_LINK_GOOGLE: {
            email: string;
            googleId: string;
        }
        LOGOUT_ALL: {
            auth_version: number;
        }
        FAILED_LOGOUT_ALL: {
            reason: string;
        }
        CHANGE_PASSWORD: {
            auth_version: number;
            method: "change-password" | "set-password";
        }
        FAILED_CHANGE_PASSWORD: {
            reason: string;
        }
        FORGOT_PASSWORD_REQUEST: {
            email: string;
        }
        FAILED_FORGOT_PASSWORD: {
            reason: string;
        }
        RESET_PASSWORD: {
            email: string;
        }
        FAILED_RESET_PASSWORD: {
            reason: string;
        }
        CONNECT_GOOGLE: {
            userId: string;
            googleId: string;
            email: string;
        }
        DISCONNECT_GOOGLE: {
            userId: string;
            googleId: string;
        }
        FAILED_DISCONNECT_GOOGLE: {
            userId: string;
            reason: string;
        }
        FAILED_CONNECT_GOOGLE: {
            userId: string;
            googleId: string;
            email: string;
            reason: string;
        }
        FAILED_SET_PASSWORD: {
            userId: string;
            reason: string;
        }
    }
    SEARCH: {
        CREATE: {
            id: string;
            origins: string[];
            destinations: string[];
            departure_date: Date;
            return_date?: Date;
            layover_days?: number[];
            criteria: {
                priority: "balanced" | "cheap" | "fast";
                max_price?: number;
            }
        }
        COMPLETE: {
            id: string;
            itinerary_id: string;
        }
        FAIL: {
            id: string;
        }
        SHARE: {
            id: string;
        }
        PRIVATIZE: {
            id: string;
        }
    }
    AGENT: {
        CHAT: {
            messages_count: number;
            model: string;
        }
        TOOL_CALL: {
            tool: string;
            args: any;
        }
    }
}

export type AuditUser = {
    id: string | null
    username?: string | null
    ip: string
    userAgent: string
}

export type AuditEntry<
    R extends keyof AuditDetails,
    A extends keyof AuditDetails[R] = keyof AuditDetails[R]
> = {
    /**
     * Timestamp of the audit
     */
    timestamp: Date
    /**
     * User that performed the action
     */
    user: AuditUser
    /**
     * Resource that was acted upon
     */
    resource: R
    /**
     * Action that was performed
     */
    action: A
    /**
     * Details of the action
     */
    details: AuditDetails[R][A]
}
