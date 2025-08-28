import { serial, text, pgTable, timestamp, integer, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 30 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password_hash: text('password_hash').notNull(),
  profile_picture_url: text('profile_picture_url'), // Nullable by default
  bio: text('bio'), // Nullable by default
  followers_count: integer('followers_count').notNull().default(0),
  following_count: integer('following_count').notNull().default(0),
  posts_count: integer('posts_count').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Posts table
export const postsTable = pgTable('posts', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  image_url: text('image_url').notNull(),
  caption: text('caption'), // Nullable by default
  likes_count: integer('likes_count').notNull().default(0),
  comments_count: integer('comments_count').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Likes table
export const likesTable = pgTable('likes', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  post_id: integer('post_id').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Comments table
export const commentsTable = pgTable('comments', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  post_id: integer('post_id').notNull(),
  content: text('content').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Follows table
export const followsTable = pgTable('follows', {
  id: serial('id').primaryKey(),
  follower_id: integer('follower_id').notNull(),
  following_id: integer('following_id').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  posts: many(postsTable),
  likes: many(likesTable),
  comments: many(commentsTable),
  followers: many(followsTable, { relationName: 'UserFollowers' }),
  following: many(followsTable, { relationName: 'UserFollowing' }),
}));

export const postsRelations = relations(postsTable, ({ one, many }) => ({
  author: one(usersTable, {
    fields: [postsTable.user_id],
    references: [usersTable.id],
  }),
  likes: many(likesTable),
  comments: many(commentsTable),
}));

export const likesRelations = relations(likesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [likesTable.user_id],
    references: [usersTable.id],
  }),
  post: one(postsTable, {
    fields: [likesTable.post_id],
    references: [postsTable.id],
  }),
}));

export const commentsRelations = relations(commentsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [commentsTable.user_id],
    references: [usersTable.id],
  }),
  post: one(postsTable, {
    fields: [commentsTable.post_id],
    references: [postsTable.id],
  }),
}));

export const followsRelations = relations(followsTable, ({ one }) => ({
  follower: one(usersTable, {
    fields: [followsTable.follower_id],
    references: [usersTable.id],
    relationName: 'UserFollowers',
  }),
  following: one(usersTable, {
    fields: [followsTable.following_id],
    references: [usersTable.id],
    relationName: 'UserFollowing',
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Post = typeof postsTable.$inferSelect;
export type NewPost = typeof postsTable.$inferInsert;

export type Like = typeof likesTable.$inferSelect;
export type NewLike = typeof likesTable.$inferInsert;

export type Comment = typeof commentsTable.$inferSelect;
export type NewComment = typeof commentsTable.$inferInsert;

export type Follow = typeof followsTable.$inferSelect;
export type NewFollow = typeof followsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  users: usersTable,
  posts: postsTable,
  likes: likesTable,
  comments: commentsTable,
  follows: followsTable,
};

export const allRelations = {
  usersRelations,
  postsRelations,
  likesRelations,
  commentsRelations,
  followsRelations,
};