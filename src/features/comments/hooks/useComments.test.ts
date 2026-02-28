import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';

// mock the toast so it doesn't spam output
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

// We'll mock the entire actions module; later tests will import it to get
// access to the individual mock functions.
vi.mock('@/app/actions/comments', () => ({
  getComments: vi.fn(),
  createComment: vi.fn(),
  updateComment: vi.fn(),
  deleteComment: vi.fn(),
}));

// import the hook under test _after_ mocks are defined
import { useComments } from './useComments';
import type { CommentWithUser } from '../types';

// utility to wait for next tick
const flushPromises = () => new Promise((r) => setTimeout(r, 0));

describe('useComments hook', () => {
  beforeEach(async () => {
    const actions = await import('@/app/actions/comments');
    const createCommentMock = actions.createComment as unknown as ReturnType<typeof vi.fn>;
    const getCommentsMock = actions.getComments as unknown as ReturnType<typeof vi.fn>;
    const updateCommentMock = actions.updateComment as unknown as ReturnType<typeof vi.fn>;
    const deleteCommentMock = actions.deleteComment as unknown as ReturnType<typeof vi.fn>;
    createCommentMock.mockReset();
    getCommentsMock.mockReset();
    updateCommentMock.mockReset();
    deleteCommentMock.mockReset();
  });

  it('optimistically updates comments when addComment is called', async () => {
    // grab the mocked createComment from the module so we can control its resolution
    const actions = await import('@/app/actions/comments');
    const createCommentMock = actions.createComment as unknown as ReturnType<typeof vi.fn>;
    let resolver: () => void;
    createCommentMock.mockImplementation(
      () =>
        new Promise<void>((r) => {
          resolver = r;
        })
    );

    const onCommentChange = vi.fn();
    const { result } = renderHook(() =>
      useComments({
        assetId: 'asset-1',
        projectId: 'proj-1',
        onCommentChange,
        currentUserId: 'u1',
        currentUserDisplayName: 'Test User',
        currentUserAvatarUrl: null,
      })
    );

    // initially no comments
    expect(result.current.comments).toHaveLength(0);

    // call addComment and capture the promise
    let promise: Promise<void>;
    await act(async () => {
      promise = result.current.addComment('hello', 123);
    });
    // after invocation the optimistic comment should be applied
    expect(result.current.comments).toHaveLength(1);
    expect(result.current.comments[0].content).toBe('hello');
    expect(result.current.comments[0].id).toMatch(/^temp-/);
    expect(onCommentChange).toHaveBeenCalledWith('asset-1', 1);

    // resolve the underlying API call
    act(() => {
      resolver!();
    });

    // wait for promise to settle
    await act(async () => {
      await promise!;
    });

    // comments should remain unchanged (optimistic was kept)
    expect(result.current.comments).toHaveLength(1);
    expect(onCommentChange).toHaveBeenCalledTimes(1);
  });

  it('rolls back state when addComment API fails', async () => {
    const actions = await import('@/app/actions/comments');
    const createCommentMock = actions.createComment as unknown as ReturnType<typeof vi.fn>;
    const error = new Error('network error');
    createCommentMock.mockRejectedValue(error);

    const onCommentChange = vi.fn();
    const { result } = renderHook(() =>
      useComments({
        assetId: 'a',
        projectId: 'p',
        onCommentChange,
        currentUserId: 'u2',
        currentUserDisplayName: 'Test User 2',
        currentUserAvatarUrl: null,
      })
    );

    // prepopulate with one comment so we can detect rollback
    const existing: CommentWithUser = {
      id: 'existing',
      content: 'old',
      timestamp: 1,
      created_at: new Date().toISOString(),
      updated_at: null,
      user_id: 'u',
      parent_id: null,
      author: { display_name: 'foo', avatar_url: null },
    };

    act(() => {
      result.current.setComments([existing]);
    });
    expect(result.current.comments).toEqual([existing]);

    // attempt to add new comment
    await act(async () => {
      await expect(result.current.addComment('bad', 5)).rejects.toThrow(error);
    });

    // state should have been rolled back to previous array
    expect(result.current.comments).toEqual([existing]);
    // onCommentChange should have been incremented then decremented
    expect(onCommentChange).toHaveBeenCalledWith('a', 1);
    expect(onCommentChange).toHaveBeenCalledWith('a', -1);
  });
});
