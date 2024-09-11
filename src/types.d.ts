import session from 'express-session';

declare module 'express-session' {
    interface SessionData {
        accessToken?: string;
        refreshToken?: string;
        user?: {
            id: string;
            username: string;
            avatar: string;
            discriminator: string;
        };
    }
}