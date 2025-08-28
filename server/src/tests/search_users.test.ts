import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type SearchUsersInput } from '../schema';
import { searchUsers } from '../handlers/search_users';

describe('searchUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const createTestUser = async (username: string, email: string) => {
    const result = await db.insert(usersTable)
      .values({
        username,
        email,
        password_hash: 'hashed_password_123',
        profile_picture_url: null,
        bio: `Bio for ${username}`
      })
      .returning()
      .execute();
    
    return result[0];
  };

  it('should search users by username (case-insensitive)', async () => {
    // Create test users
    await createTestUser('johnsmith', 'john@example.com');
    await createTestUser('JaneSmith', 'jane@example.com');
    await createTestUser('bobdoe', 'bob@example.com');

    const input: SearchUsersInput = {
      query: 'smith'
    };

    const results = await searchUsers(input);

    expect(results).toHaveLength(2);
    expect(results.map(u => u.username).sort()).toEqual(['JaneSmith', 'johnsmith']);
    
    // Verify all users have proper structure without password hash
    results.forEach(user => {
      expect(user.id).toBeDefined();
      expect(user.username).toBeDefined();
      expect(user.email).toBeDefined();
      expect(user.created_at).toBeInstanceOf(Date);
      expect(user.updated_at).toBeInstanceOf(Date);
      expect(user).not.toHaveProperty('password_hash');
    });
  });

  it('should return empty array when no users match query', async () => {
    await createTestUser('johnsmith', 'john@example.com');
    await createTestUser('janedoe', 'jane@example.com');

    const input: SearchUsersInput = {
      query: 'nonexistent'
    };

    const results = await searchUsers(input);

    expect(results).toHaveLength(0);
    expect(results).toEqual([]);
  });

  it('should handle partial matches correctly', async () => {
    await createTestUser('developer123', 'dev@example.com');
    await createTestUser('webdev', 'web@example.com');
    await createTestUser('designer', 'design@example.com');

    const input: SearchUsersInput = {
      query: 'dev'
    };

    const results = await searchUsers(input);

    expect(results).toHaveLength(2);
    expect(results.map(u => u.username).sort()).toEqual(['developer123', 'webdev']);
  });

  it('should respect limit parameter', async () => {
    await createTestUser('user1', 'user1@example.com');
    await createTestUser('user2', 'user2@example.com');
    await createTestUser('user3', 'user3@example.com');
    await createTestUser('user4', 'user4@example.com');

    const input: SearchUsersInput = {
      query: 'user',
      limit: 2
    };

    const results = await searchUsers(input);

    expect(results).toHaveLength(2);
    results.forEach(user => {
      expect(user.username).toMatch(/user\d/);
    });
  });

  it('should handle search without limit', async () => {
    await createTestUser('test1', 'test1@example.com');
    await createTestUser('test2', 'test2@example.com');
    await createTestUser('test3', 'test3@example.com');

    const input: SearchUsersInput = {
      query: 'test'
    };

    const results = await searchUsers(input);

    expect(results).toHaveLength(3);
    expect(results.map(u => u.username).sort()).toEqual(['test1', 'test2', 'test3']);
  });

  it('should return all user fields except password hash', async () => {
    const testUser = await createTestUser('completeuser', 'complete@example.com');

    const input: SearchUsersInput = {
      query: 'complete'
    };

    const results = await searchUsers(input);

    expect(results).toHaveLength(1);
    const user = results[0];

    expect(user.id).toEqual(testUser.id);
    expect(user.username).toEqual('completeuser');
    expect(user.email).toEqual('complete@example.com');
    expect(user.profile_picture_url).toBeNull();
    expect(user.bio).toEqual('Bio for completeuser');
    expect(user.followers_count).toEqual(0);
    expect(user.following_count).toEqual(0);
    expect(user.posts_count).toEqual(0);
    expect(user.created_at).toBeInstanceOf(Date);
    expect(user.updated_at).toBeInstanceOf(Date);
    expect(user).not.toHaveProperty('password_hash');
  });

  it('should handle single character search', async () => {
    await createTestUser('alice', 'alice@example.com');
    await createTestUser('bob', 'bob@example.com');
    await createTestUser('charlie', 'charlie@example.com');

    const input: SearchUsersInput = {
      query: 'a'
    };

    const results = await searchUsers(input);

    expect(results).toHaveLength(2); // alice and charlie contain 'a'
    expect(results.map(u => u.username).sort()).toEqual(['alice', 'charlie']);
  });

  it('should handle case insensitive search correctly', async () => {
    await createTestUser('TestUser', 'test@example.com');
    await createTestUser('UPPERCASE', 'upper@example.com');
    await createTestUser('lowercase', 'lower@example.com');

    const input: SearchUsersInput = {
      query: 'TEST'
    };

    const results = await searchUsers(input);

    expect(results).toHaveLength(1);
    expect(results[0].username).toEqual('TestUser');
  });
});