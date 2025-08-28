import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterUserInput, type PublicUser } from '../schema';
import { eq, or } from 'drizzle-orm';
import { createHash, randomBytes, pbkdf2Sync } from 'crypto';

export const registerUser = async (input: RegisterUserInput): Promise<PublicUser> => {
  try {
    // Check if username or email already exists
    const existingUsers = await db.select()
      .from(usersTable)
      .where(
        or(
          eq(usersTable.username, input.username),
          eq(usersTable.email, input.email)
        )
      )
      .execute();

    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      if (existingUser.username === input.username) {
        throw new Error('Username already exists');
      }
      if (existingUser.email === input.email) {
        throw new Error('Email already exists');
      }
    }

    // Hash the password using PBKDF2
    const salt = randomBytes(32).toString('hex');
    const hash = pbkdf2Sync(input.password, salt, 10000, 64, 'sha512').toString('hex');
    const password_hash = `${salt}:${hash}`;

    // Create new user record
    const result = await db.insert(usersTable)
      .values({
        username: input.username,
        email: input.email,
        password_hash: password_hash,
        profile_picture_url: null,
        bio: null,
        followers_count: 0,
        following_count: 0,
        posts_count: 0
      })
      .returning()
      .execute();

    const user = result[0];

    // Return user data without password hash
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      profile_picture_url: user.profile_picture_url,
      bio: user.bio,
      followers_count: user.followers_count,
      following_count: user.following_count,
      posts_count: user.posts_count,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
  } catch (error) {
    console.error('User registration failed:', error);
    throw error;
  }
};