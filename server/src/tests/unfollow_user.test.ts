import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, followsTable } from '../db/schema';
import { type FollowUserInput } from '../schema';
import { unfollowUser } from '../handlers/unfollow_user';
import { eq, and } from 'drizzle-orm';

// Test input
const testInput: FollowUserInput = {
  follower_id: 1,
  following_id: 2
};

describe('unfollowUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should successfully unfollow a user when follow relationship exists', async () => {
    // Create test users
    await db.insert(usersTable)
      .values([
        {
          username: 'follower_user',
          email: 'follower@test.com',
          password_hash: 'hash1',
          following_count: 1
        },
        {
          username: 'following_user',
          email: 'following@test.com',
          password_hash: 'hash2',
          followers_count: 1
        }
      ])
      .execute();

    // Create existing follow relationship
    await db.insert(followsTable)
      .values({
        follower_id: 1,
        following_id: 2
      })
      .execute();

    const result = await unfollowUser(testInput);

    // Should return success
    expect(result.success).toBe(true);
  });

  it('should remove follow record from database', async () => {
    // Create test users and follow relationship
    await db.insert(usersTable)
      .values([
        {
          username: 'follower_user',
          email: 'follower@test.com',
          password_hash: 'hash1',
          following_count: 1
        },
        {
          username: 'following_user',
          email: 'following@test.com',
          password_hash: 'hash2',
          followers_count: 1
        }
      ])
      .execute();

    await db.insert(followsTable)
      .values({
        follower_id: 1,
        following_id: 2
      })
      .execute();

    await unfollowUser(testInput);

    // Verify follow record is deleted
    const followRecords = await db.select()
      .from(followsTable)
      .where(
        and(
          eq(followsTable.follower_id, 1),
          eq(followsTable.following_id, 2)
        )
      )
      .execute();

    expect(followRecords).toHaveLength(0);
  });

  it('should decrement follower and following counts', async () => {
    // Create test users with initial counts
    await db.insert(usersTable)
      .values([
        {
          username: 'follower_user',
          email: 'follower@test.com',
          password_hash: 'hash1',
          following_count: 5
        },
        {
          username: 'following_user',
          email: 'following@test.com',
          password_hash: 'hash2',
          followers_count: 3
        }
      ])
      .execute();

    // Create follow relationship
    await db.insert(followsTable)
      .values({
        follower_id: 1,
        following_id: 2
      })
      .execute();

    await unfollowUser(testInput);

    // Check follower's following_count decreased
    const follower = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, 1))
      .execute();
    
    expect(follower[0].following_count).toBe(4);

    // Check following user's followers_count decreased
    const following = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, 2))
      .execute();
    
    expect(following[0].followers_count).toBe(2);
  });

  it('should not allow counts to go below zero', async () => {
    // Create test users with counts at 0
    await db.insert(usersTable)
      .values([
        {
          username: 'follower_user',
          email: 'follower@test.com',
          password_hash: 'hash1',
          following_count: 0
        },
        {
          username: 'following_user',
          email: 'following@test.com',
          password_hash: 'hash2',
          followers_count: 0
        }
      ])
      .execute();

    // Create follow relationship (counts might be inconsistent)
    await db.insert(followsTable)
      .values({
        follower_id: 1,
        following_id: 2
      })
      .execute();

    await unfollowUser(testInput);

    // Verify counts remain at 0, not negative
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, 1))
      .execute();
    
    expect(users[0].following_count).toBe(0);

    const followingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, 2))
      .execute();
    
    expect(followingUser[0].followers_count).toBe(0);
  });

  it('should return false when no follow relationship exists', async () => {
    // Create test users without follow relationship
    await db.insert(usersTable)
      .values([
        {
          username: 'follower_user',
          email: 'follower@test.com',
          password_hash: 'hash1'
        },
        {
          username: 'following_user',
          email: 'following@test.com',
          password_hash: 'hash2'
        }
      ])
      .execute();

    const result = await unfollowUser(testInput);

    // Should return false since no follow relationship exists
    expect(result.success).toBe(false);
  });

  it('should not modify user counts when no follow relationship exists', async () => {
    // Create test users with initial counts
    await db.insert(usersTable)
      .values([
        {
          username: 'follower_user',
          email: 'follower@test.com',
          password_hash: 'hash1',
          following_count: 5
        },
        {
          username: 'following_user',
          email: 'following@test.com',
          password_hash: 'hash2',
          followers_count: 3
        }
      ])
      .execute();

    await unfollowUser(testInput);

    // Verify counts remain unchanged
    const follower = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, 1))
      .execute();
    
    expect(follower[0].following_count).toBe(5);

    const following = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, 2))
      .execute();
    
    expect(following[0].followers_count).toBe(3);
  });

  it('should handle same user trying to unfollow themselves', async () => {
    // Create one user
    await db.insert(usersTable)
      .values({
        username: 'test_user',
        email: 'test@test.com',
        password_hash: 'hash1'
      })
      .execute();

    const selfUnfollowInput: FollowUserInput = {
      follower_id: 1,
      following_id: 1
    };

    const result = await unfollowUser(selfUnfollowInput);

    // Should return false since no follow relationship should exist
    expect(result.success).toBe(false);
  });
});