import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { trpc } from '@/utils/trpc';
import type { Post, PublicUser, Comment } from '../../../server/src/schema';

interface PostCardProps {
  post: Post;
  currentUser: PublicUser;
  onLike: (postId: number) => void;
  onComment: (postId: number, content: string) => void;
}

export function PostCard({ post, currentUser, onLike, onComment }: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [postUser, setPostUser] = useState<PublicUser | null>(null);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  // Load the user who created this post
  const loadPostUser = useCallback(async () => {
    try {
      const user = await trpc.getUserById.query({ id: post.user_id });
      setPostUser(user);
    } catch (error) {
      console.error('Failed to load post user:', error);
    }
  }, [post.user_id]);

  // Load comments for this post
  const loadComments = useCallback(async () => {
    if (!showComments) return;
    
    try {
      setIsLoadingComments(true);
      const postComments = await trpc.getComments.query({
        post_id: post.id,
        limit: 50,
        offset: 0
      });
      setComments(postComments);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setIsLoadingComments(false);
    }
  }, [post.id, showComments]);

  useEffect(() => {
    loadPostUser();
  }, [loadPostUser]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleLike = () => {
    onLike(post.id);
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    await onComment(post.id, newComment.trim());
    setNewComment('');
    // Reload comments to show the new one
    if (showComments) {
      loadComments();
    }
  };

  const toggleComments = () => {
    setShowComments(!showComments);
  };

  return (
    <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
      {/* Header with user info */}
      <div className="p-4 flex items-center">
        <Avatar className="w-8 h-8 mr-3">
          <AvatarImage src={postUser?.profile_picture_url || undefined} />
          <AvatarFallback className="bg-gray-200 text-gray-700 text-sm">
            {postUser?.username.charAt(0).toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <span className="font-semibold text-sm">
          {postUser?.username || 'Loading...'}
        </span>
      </div>

      {/* Post image */}
      <div className="aspect-square">
        <img
          src={post.image_url}
          alt="Post content"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Action buttons */}
      <div className="p-4">
        <div className="flex items-center space-x-4 mb-3">
          <button
            onClick={handleLike}
            className="text-2xl hover:opacity-70 transition-opacity"
            title="Like"
          >
            ❤️
          </button>
          <button
            onClick={toggleComments}
            className="text-2xl hover:opacity-70 transition-opacity"
            title="Comment"
          >
            💬
          </button>
        </div>

        {/* Likes count */}
        <div className="font-semibold text-sm mb-2">
          {post.likes_count} {post.likes_count === 1 ? 'like' : 'likes'}
        </div>

        {/* Caption */}
        {post.caption && (
          <div className="text-sm mb-2">
            <span className="font-semibold mr-2">{postUser?.username}</span>
            {post.caption}
          </div>
        )}

        {/* Comments count */}
        {post.comments_count > 0 && (
          <button
            onClick={toggleComments}
            className="text-gray-500 text-sm mb-2 hover:text-gray-700"
          >
            View all {post.comments_count} comments
          </button>
        )}

        {/* Comments section */}
        {showComments && (
          <div className="mt-3 space-y-2">
            {isLoadingComments ? (
              <div className="text-center py-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mx-auto"></div>
              </div>
            ) : (
              comments.map((comment: Comment) => (
                <div key={comment.id} className="text-sm">
                  <span className="font-semibold mr-2">User{comment.user_id}</span>
                  {comment.content}
                </div>
              ))
            )}
          </div>
        )}

        {/* Add comment form */}
        <form onSubmit={handleCommentSubmit} className="mt-3 flex items-center space-x-2">
          <Input
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewComment(e.target.value)}
            className="flex-1 border-none p-0 text-sm focus:ring-0"
            maxLength={500}
          />
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            disabled={!newComment.trim()}
            className="text-blue-500 hover:text-blue-700 text-sm font-semibold p-0"
          >
            Post
          </Button>
        </form>

        {/* Timestamp */}
        <div className="text-xs text-gray-400 mt-2">
          {post.created_at.toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}