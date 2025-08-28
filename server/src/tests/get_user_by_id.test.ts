import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type GetUserByIdInput } from '../schema';
import { getUserById } from '../handlers/get_user_by_id';
import { eq } from 'drizzle-orm';

// Test input
const testInput: GetUserByIdInput = {
  id: 1
};

describe('getUserById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user when found', async () => {
    // Create a test user first
    await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword123',
        profile_picture_url: 'https://example.com/avatar.jpg',
        bio: 'Test user bio',
        followers_count: 10,
        following_count: 5,
        posts_count: 3
      })
      .execute();

    const result = await getUserById(testInput);

    // Verify user data is returned correctly
    expect(result).not.toBeNull();
    expect(result!.id).toBe(1);
    expect(result!.username).toBe('testuser');
    expect(result!.email).toBe('test@example.com');
    expect(result!.profile_picture_url).toBe('https://example.com/avatar.jpg');
    expect(result!.bio).toBe('Test user bio');
    expect(result!.followers_count).toBe(10);
    expect(result!.following_count).toBe(5);
    expect(result!.posts_count).toBe(3);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);

    // Verify password_hash is not included (PublicUser type)
    expect((result as any).password_hash).toBeUndefined();
  });

  it('should return null when user not found', async () => {
    const nonExistentInput: GetUserByIdInput = {
      id: 999
    };

    const result = await getUserById(nonExistentInput);

    expect(result).toBeNull();
  });

  it('should handle user with null optional fields', async () => {
    // Create user with minimal required fields
    await db.insert(usersTable)
      .values({
        username: 'minimaluser',
        email: 'minimal@example.com',
        password_hash: 'hashedpassword123',
        profile_picture_url: null,
        bio: null
      })
      .execute();

    const result = await getUserById(testInput);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(1);
    expect(result!.username).toBe('minimaluser');
    expect(result!.email).toBe('minimal@example.com');
    expect(result!.profile_picture_url).toBeNull();
    expect(result!.bio).toBeNull();
    expect(result!.followers_count).toBe(0); // Default value
    expect(result!.following_count).toBe(0); // Default value
    expect(result!.posts_count).toBe(0); // Default value
  });

  it('should verify user exists in database after retrieval', async () => {
    // Create test user
    await db.insert(usersTable)
      .values({
        username: 'verifyuser',
        email: 'verify@example.com',
        password_hash: 'hashedpassword123',
        bio: 'Verification test'
      })
      .execute();

    const result = await getUserById(testInput);

    // Verify the user actually exists in database
    const dbUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testInput.id))
      .execute();

    expect(dbUsers).toHaveLength(1);
    expect(dbUsers[0].username).toBe('verifyuser');
    expect(dbUsers[0].email).toBe('verify@example.com');
    expect(dbUsers[0].bio).toBe('Verification test');

    // Verify handler result matches database record
    expect(result!.username).toBe(dbUsers[0].username);
    expect(result!.email).toBe(dbUsers[0].email);
    expect(result!.bio).toBe(dbUsers[0].bio);
    expect(result!.created_at).toEqual(dbUsers[0].created_at);
  });

  it('should handle different user IDs correctly', async () => {
    // Create multiple users
    await db.insert(usersTable)
      .values([
        {
          username: 'user1',
          email: 'user1@example.com',
          password_hash: 'hash1'
        },
        {
          username: 'user2',
          email: 'user2@example.com',
          password_hash: 'hash2'
        }
      ])
      .execute();

    // Test retrieving first user
    const user1 = await getUserById({ id: 1 });
    expect(user1).not.toBeNull();
    expect(user1!.username).toBe('user1');
    expect(user1!.email).toBe('user1@example.com');

    // Test retrieving second user
    const user2 = await getUserById({ id: 2 });
    expect(user2).not.toBeNull();
    expect(user2!.username).toBe('user2');
    expect(user2!.email).toBe('user2@example.com');

    // Test non-existent user
    const user3 = await getUserById({ id: 3 });
    expect(user3).toBeNull();
  });
});