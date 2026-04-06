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
        UPDATE: {
            username?: string;
            public?: boolean;
            preferences?: {
                price_weight?: number;
                duration_weight?: number;
                stops_weight?: number;
                airline_quality_weight?: number;
            }
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
        FAILED_LOGIN: {
            identifier: string;
            reason: string;
        }
        LOGOUT_ALL: {
            auth_version: number;
        }
        FAILED_LOGOUT_ALL: {
            reason: string;
        }
        CHANGE_PASSWORD: {
            auth_version: number;
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
}

export type AuditUser = {
    id: string | null
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
