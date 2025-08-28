import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserProfileInput, type PublicUser } from '../schema';
import { eq, and, ne, sql } from 'drizzle-orm';

export const updateUserProfile = async (input: UpdateUserProfileInput): Promise<PublicUser> => {
  try {
    // First, check if the user exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.id))
      .execute();

    if (existingUser.length === 0) {
      throw new Error('User not found');
    }

    // If username is being changed, check if it's already taken by another user
    if (input.username) {
      const usernameCheck = await db.select()
        .from(usersTable)
        .where(
          and(
            eq(usersTable.username, input.username),
            ne(usersTable.id, input.id)
          )
        )
        .execute();

      if (usernameCheck.length > 0) {
        throw new Error('Username already exists');
      }
    }

    // If email is being changed, check if it's already taken by another user
    if (input.email) {
      const emailCheck = await db.select()
        .from(usersTable)
        .where(
          and(
            eq(usersTable.email, input.email),
            ne(usersTable.id, input.id)
          )
        )
        .execute();

      if (emailCheck.length > 0) {
        throw new Error('Email already exists');
      }
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: sql`NOW()` // Always update the timestamp
    };

    if (input.username !== undefined) {
      updateData.username = input.username;
    }

    if (input.email !== undefined) {
      updateData.email = input.email;
    }

    if (input.profile_picture_url !== undefined) {
      updateData.profile_picture_url = input.profile_picture_url;
    }

    if (input.bio !== undefined) {
      updateData.bio = input.bio;
    }

    // Update the user
    const result = await db.update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, input.id))
      .returning()
      .execute();

    const updatedUser = result[0];

    // Return PublicUser (without password_hash)
    return {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      profile_picture_url: updatedUser.profile_picture_url,
      bio: updatedUser.bio,
      followers_count: updatedUser.followers_count,
      following_count: updatedUser.following_count,
      posts_count: updatedUser.posts_count,
      created_at: updatedUser.created_at,
      updated_at: updatedUser.updated_at
    };
  } catch (error) {
    console.error('User profile update failed:', error);
    throw error;
  }
};