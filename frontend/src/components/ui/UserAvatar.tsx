import { PublicUser, User, PopulatedUser, FriendUser } from "@/api/generated/model";

interface UserAvatarProps {
    user?: User | PopulatedUser | PublicUser | FriendUser | null;
    className?: string;
    size?: number;
}

export default function UserAvatar({ user, className = "", size = 32 }: UserAvatarProps) {
    const baseUrl = import.meta.env.VITE_BACKEND_API_BASE_URL || "";
    const avatarUrl = user?.profile_picture
        ? `${baseUrl.replace(/\/$/, '')}${user.profile_picture}`
        : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?._id || 'default'}`;

    return (
        <img
            src={avatarUrl}
            className={`rounded-full shadow-inner bg-secondary border border-themed object-cover ${className}`}
            style={{ width: size, height: size }}
            alt={`${user?.username || 'User'}'s avatar`}
        />
    );
}
