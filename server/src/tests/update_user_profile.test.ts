import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserProfileInput } from '../schema';
import { updateUserProfile } from '../handlers/update_user_profile';
import { eq } from 'drizzle-orm';

// Helper to create a test user
const createTestUser = async (userData: {
  username: string;
  email: string;
  password_hash: string;
  profile_picture_url?: string | null;
  bio?: string | null;
}) => {
  const result = await db.insert(usersTable)
    .values(userData)
    .returning()
    .execute();
  return result[0];
};

describe('updateUserProfile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update user profile with all fields', async () => {
    // Create test user
    const testUser = await createTestUser({
      username: 'originaluser',
      email: 'original@example.com',
      password_hash: 'hashedpassword',
      profile_picture_url: null,
      bio: null
    });

    const updateInput: UpdateUserProfileInput = {
      id: testUser.id,
      username: 'newusername',
      email: 'newemail@example.com',
      profile_picture_url: 'https://example.com/new-avatar.jpg',
      bio: 'This is my new bio'
    };

    const result = await updateUserProfile(updateInput);

    // Verify returned data
    expect(result.id).toEqual(testUser.id);
    expect(result.username).toEqual('newusername');
    expect(result.email).toEqual('newemail@example.com');
    expect(result.profile_picture_url).toEqual('https://example.com/new-avatar.jpg');
    expect(result.bio).toEqual('This is my new bio');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(testUser.updated_at.getTime());

    // Verify password_hash is not included (PublicUser)
    expect((result as any).password_hash).toBeUndefined();
  });

  it('should update only provided fields', async () => {
    // Create test user
    const testUser = await createTestUser({
      username: 'originaluser',
      email: 'original@example.com',
      password_hash: 'hashedpassword',
      profile_picture_url: 'https://example.com/original-avatar.jpg',
      bio: 'Original bio'
    });

    const updateInput: UpdateUserProfileInput = {
      id: testUser.id,
      username: 'updatedusername'
    };

    const result = await updateUserProfile(updateInput);

    // Verify only username was updated
    expect(result.username).toEqual('updatedusername');
    expect(result.email).toEqual('original@example.com');
    expect(result.profile_picture_url).toEqual('https://example.com/original-avatar.jpg');
    expect(result.bio).toEqual('Original bio');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(testUser.updated_at.getTime());
  });

  it('should save updated profile to database', async () => {
    // Create test user
    const testUser = await createTestUser({
      username: 'originaluser',
      email: 'original@example.com',
      password_hash: 'hashedpassword'
    });

    const updateInput: UpdateUserProfileInput = {
      id: testUser.id,
      username: 'databaseuser',
      email: 'database@example.com',
      bio: 'Database test bio'
    };

    await updateUserProfile(updateInput);

    // Query database to verify changes were persisted
    const updatedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUser.id))
      .execute();

    expect(updatedUser).toHaveLength(1);
    expect(updatedUser[0].username).toEqual('databaseuser');
    expect(updatedUser[0].email).toEqual('database@example.com');
    expect(updatedUser[0].bio).toEqual('Database test bio');
    expect(updatedUser[0].updated_at).toBeInstanceOf(Date);
    expect(updatedUser[0].updated_at.getTime()).toBeGreaterThan(testUser.updated_at.getTime());
  });

  it('should handle nullable fields correctly', async () => {
    // Create test user with some values
    const testUser = await createTestUser({
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'hashedpassword',
      profile_picture_url: 'https://example.com/avatar.jpg',
      bio: 'Original bio'
    });

    const updateInput: UpdateUserProfileInput = {
      id: testUser.id,
      profile_picture_url: null,
      bio: null
    };

    const result = await updateUserProfile(updateInput);

    // Verify nullable fields are set to null
    expect(result.profile_picture_url).toBeNull();
    expect(result.bio).toBeNull();
    expect(result.username).toEqual('testuser'); // Unchanged
    expect(result.email).toEqual('test@example.com'); // Unchanged
  });

  it('should throw error when user does not exist', async () => {
    const updateInput: UpdateUserProfileInput = {
      id: 99999, // Non-existent user ID
      username: 'newusername'
    };

    expect(updateUserProfile(updateInput)).rejects.toThrow(/user not found/i);
  });

  it('should throw error when username already exists', async () => {
    // Create two test users
    const user1 = await createTestUser({
      username: 'user1',
      email: 'user1@example.com',
      password_hash: 'hashedpassword1'
    });

    const user2 = await createTestUser({
      username: 'user2',
      email: 'user2@example.com',
      password_hash: 'hashedpassword2'
    });

    const updateInput: UpdateUserProfileInput = {
      id: user1.id,
      username: 'user2' // Try to use user2's username
    };

    expect(updateUserProfile(updateInput)).rejects.toThrow(/username already exists/i);
  });

  it('should throw error when email already exists', async () => {
    // Create two test users
    const user1 = await createTestUser({
      username: 'user1',
      email: 'user1@example.com',
      password_hash: 'hashedpassword1'
    });

    const user2 = await createTestUser({
      username: 'user2',
      email: 'user2@example.com',
      password_hash: 'hashedpassword2'
    });

    const updateInput: UpdateUserProfileInput = {
      id: user1.id,
      email: 'user2@example.com' // Try to use user2's email
    };

    expect(updateUserProfile(updateInput)).rejects.toThrow(/email already exists/i);
  });

  it('should allow user to keep their own username and email', async () => {
    // Create test user
    const testUser = await createTestUser({
      username: 'sameuser',
      email: 'same@example.com',
      password_hash: 'hashedpassword'
    });

    const updateInput: UpdateUserProfileInput = {
      id: testUser.id,
      username: 'sameuser', // Keep same username
      email: 'same@example.com', // Keep same email
      bio: 'Updated bio only'
    };

    const result = await updateUserProfile(updateInput);

    // Should succeed without throwing username/email already exists error
    expect(result.username).toEqual('sameuser');
    expect(result.email).toEqual('same@example.com');
    expect(result.bio).toEqual('Updated bio only');
  });

  it('should preserve counts and other unchanged fields', async () => {
    // Create test user with some counts
    const testUser = await createTestUser({
      username: 'countuser',
      email: 'count@example.com',
      password_hash: 'hashedpassword'
    });

    // Manually update counts to test preservation
    await db.update(usersTable)
      .set({
        followers_count: 10,
        following_count: 5,
        posts_count: 3
      })
      .where(eq(usersTable.id, testUser.id))
      .execute();

    const updateInput: UpdateUserProfileInput = {
      id: testUser.id,
      bio: 'New bio with preserved counts'
    };

    const result = await updateUserProfile(updateInput);

    // Verify counts are preserved
    expect(result.followers_count).toEqual(10);
    expect(result.following_count).toEqual(5);
    expect(result.posts_count).toEqual(3);
    expect(result.bio).toEqual('New bio with preserved counts');
  });
});