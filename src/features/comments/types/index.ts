/**
 * Comment Types for the Comments Feature
 * Centralized type definitions for comments module
 */

export interface CommentAuthor {
  display_name: string;
  avatar_url: string | null;
}

export interface CommentWithUser {
  id: string;
  content: string;
  timestamp: number;
  created_at: string;
  updated_at: string | null;
  user_id: string;
  parent_id?: string | null;
  replyCount?: number;
  author: CommentAuthor;
}

export interface CommentThread extends CommentWithUser {
  replies: CommentWithUser[];
}

export interface CommentState {
  comments: CommentWithUser[];
  isLoading: boolean;
  error: string | null;
}

export interface OptimisticComment {
  id: string;
  content: string;
  timestamp: number;
  user_id: string;
  parent_id?: string | null;
}
