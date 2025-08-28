import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterUserInput } from '../schema';
import { registerUser } from '../handlers/register_user';
import { eq } from 'drizzle-orm';
import { pbkdf2Sync } from 'crypto';

// Helper function to verify password
const verifyPassword = (password: string, passwordHash: string): boolean => {
  const [salt, hash] = passwordHash.split(':');
  const verifyHash = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
};

// Test input data
const testInput: RegisterUserInput = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'password123'
};

const testInput2: RegisterUserInput = {
  username: 'anotheruser',
  email: 'another@example.com',
  password: 'password456'
};

describe('registerUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should register a new user successfully', async () => {
    const result = await registerUser(testInput);

    // Verify returned user data
    expect(result.username).toEqual('testuser');
    expect(result.email).toEqual('test@example.com');
    expect(result.profile_picture_url).toBeNull();
    expect(result.bio).toBeNull();
    expect(result.followers_count).toEqual(0);
    expect(result.following_count).toEqual(0);
    expect(result.posts_count).toEqual(0);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify password_hash is not in the returned data
    expect((result as any).password_hash).toBeUndefined();
  });

  it('should save user to database with hashed password', async () => {
    const result = await registerUser(testInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    const savedUser = users[0];

    expect(savedUser.username).toEqual('testuser');
    expect(savedUser.email).toEqual('test@example.com');
    expect(savedUser.password_hash).toBeDefined();
    expect(savedUser.password_hash).not.toEqual('password123'); // Should be hashed
    expect(savedUser.followers_count).toEqual(0);
    expect(savedUser.following_count).toEqual(0);
    expect(savedUser.posts_count).toEqual(0);
    expect(savedUser.created_at).toBeInstanceOf(Date);
    expect(savedUser.updated_at).toBeInstanceOf(Date);

    // Verify password was hashed correctly
    const isPasswordValid = verifyPassword('password123', savedUser.password_hash);
    expect(isPasswordValid).toBe(true);
  });

  it('should throw error when username already exists', async () => {
    // Register first user
    await registerUser(testInput);

    // Try to register user with same username but different email
    const duplicateUsernameInput: RegisterUserInput = {
      username: 'testuser', // Same username
      email: 'different@example.com',
      password: 'password456'
    };

    await expect(registerUser(duplicateUsernameInput))
      .rejects
      .toThrow(/username already exists/i);
  });

  it('should throw error when email already exists', async () => {
    // Register first user
    await registerUser(testInput);

    // Try to register user with same email but different username
    const duplicateEmailInput: RegisterUserInput = {
      username: 'differentuser',
      email: 'test@example.com', // Same email
      password: 'password456'
    };

    await expect(registerUser(duplicateEmailInput))
      .rejects
      .toThrow(/email already exists/i);
  });

  it('should allow multiple users with different usernames and emails', async () => {
    // Register first user
    const user1 = await registerUser(testInput);
    
    // Register second user with different credentials
    const user2 = await registerUser(testInput2);

    // Verify both users were created
    expect(user1.username).toEqual('testuser');
    expect(user1.email).toEqual('test@example.com');
    expect(user2.username).toEqual('anotheruser');
    expect(user2.email).toEqual('another@example.com');

    // Verify both users have different IDs
    expect(user1.id).not.toEqual(user2.id);

    // Verify both users exist in database
    const allUsers = await db.select().from(usersTable).execute();
    expect(allUsers).toHaveLength(2);
  });

  it('should handle password hashing correctly for different passwords', async () => {
    // Register users with different passwords
    const user1 = await registerUser(testInput);
    const user2 = await registerUser(testInput2);

    // Get saved users from database
    const savedUsers = await db.select().from(usersTable).execute();
    const savedUser1 = savedUsers.find(u => u.id === user1.id)!;
    const savedUser2 = savedUsers.find(u => u.id === user2.id)!;

    // Verify passwords are hashed differently
    expect(savedUser1.password_hash).not.toEqual(savedUser2.password_hash);
    expect(savedUser1.password_hash).not.toEqual('password123');
    expect(savedUser2.password_hash).not.toEqual('password456');

    // Verify each password can be validated correctly
    const isUser1PasswordValid = verifyPassword('password123', savedUser1.password_hash);
    const isUser2PasswordValid = verifyPassword('password456', savedUser2.password_hash);
    
    expect(isUser1PasswordValid).toBe(true);
    expect(isUser2PasswordValid).toBe(true);

    // Verify cross-validation fails
    const isUser1WrongPassword = verifyPassword('password456', savedUser1.password_hash);
    const isUser2WrongPassword = verifyPassword('password123', savedUser2.password_hash);
    
    expect(isUser1WrongPassword).toBe(false);
    expect(isUser2WrongPassword).toBe(false);
  });

  it('should create unique salt for each password hash', async () => {
    // Register the same user data multiple times (simulate multiple registrations)
    // First clear any existing data
    const user1Input: RegisterUserInput = {
      username: 'user1',
      email: 'user1@example.com',
      password: 'samepassword'
    };

    const user2Input: RegisterUserInput = {
      username: 'user2', 
      email: 'user2@example.com',
      password: 'samepassword' // Same password
    };

    const user1 = await registerUser(user1Input);
    const user2 = await registerUser(user2Input);

    // Get saved users from database
    const savedUsers = await db.select().from(usersTable).execute();
    const savedUser1 = savedUsers.find(u => u.id === user1.id)!;
    const savedUser2 = savedUsers.find(u => u.id === user2.id)!;

    // Even with the same password, hashes should be different due to unique salts
    expect(savedUser1.password_hash).not.toEqual(savedUser2.password_hash);
    
    // But both should verify correctly
    expect(verifyPassword('samepassword', savedUser1.password_hash)).toBe(true);
    expect(verifyPassword('samepassword', savedUser2.password_hash)).toBe(true);
  });
});