/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    user?: {
      userId: string; // or ObjectId if you store it as such directly
      username: string;
      email: string;
      credits?: number;
      isVerified?: boolean;
      isAdmin?: boolean;
      createdAt?: string | Date;
      updatedAt?: string | Date;
      profile?: {
        displayName?: string;
        bio?: string;
        [key: string]: any;
      };
      // Add any other properties your user object on Astro.locals has
    };
    // Define other Astro.locals properties if any (e.g., dbInstance)
    dbInstance?: import('mongodb').Db;
    // session?: Session; // If you use sessions
  }
}
