import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginUserInput, type PublicUser } from '../schema';
import { eq } from 'drizzle-orm';

export const loginUser = async (input: LoginUserInput): Promise<PublicUser> => {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = users[0];

    // Verify password using Bun's password verification
    const isPasswordValid = await Bun.password.verify(input.password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Return user data without password hash
    const { password_hash, ...publicUser } = user;
    return publicUser;
  } catch (error) {
    console.error('User login failed:', error);
    throw error;
  }
};