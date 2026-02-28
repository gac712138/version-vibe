# 🎯 Codebase Audit - Quick Reference Card

## 📊 Key Findings

### 🔴 CRITICAL Issues (Immediate Action)

| Component | Lines | Issue | Extract Hooks |
|-----------|-------|-------|----------------|
| TrackComments.tsx | 550 | 6 useEffect + Supabase | 4 hooks |
| TrackPlayer.tsx | 463 | 7 useEffect + Supabase | 5 hooks |

**Total Critical Impact:** 1,013 lines (46% of feature code)

### 🟡 HIGH Priority Issues

| Component | Lines | Issue | Action |
|-----------|-------|-------|--------|
| ProjectHeader.tsx | 232 | Image crop logic | Extract useImageCropper |
| CreateProjectBtn.tsx | 216 | Image crop logic | Extract useImageCropper (shared) |
| UploadVersionBtn.tsx | 153 | Upload progress | Extract useFileUpload |
| PlayerControls.tsx | 181 | Volume control | Extract useVolumeControl |

### 📁 Missing Files

- ❌ 12 missing `index.ts` files
- ❌ 4 feature modules lack clear API boundaries
- ❌ 0 type definition exports

---

## 🪝 Hooks to Extract (Prioritized)

### Week 1: CRITICAL (2-3hrs each)

```typescript
// src/features/comments/hooks/useComments.ts
export function useComments(assetId: string, projectId: string) {
  // Handle: List, pagination, filtering
  // Replace 2 useEffect instances
}

// src/features/comments/hooks/useCommentRealtime.ts
export function useCommentRealtime({ assetId, onNewComment, ... }) {
  // Handle: Realtime subscriptions
  // Replace 1 useEffect instance
}

// src/features/comments/hooks/useCommentActions.ts
export function useCommentActions({ projectId, assetId, ... }) {
  // Handle: CRUD operations
  // Replace 1 useEffect instance
}

// src/features/player/hooks/useAudioPlayer.ts
export function useAudioPlayer() {
  // Handle: Play/pause, seek, duration, mute
  // Replace 2 useEffect instances
}

// src/features/player/hooks/useVersions.ts
export function useVersions(trackId: string) {
  // Handle: Version list management
  // Replace 1 useEffect instance
}
```

---

## ✅ Implementation Checklist

### Phase 1: Hook Extraction (Week 1)
- [ ] Create `useComments.ts`
- [ ] Create `useCommentRealtime.ts`
- [ ] Create `useCommentActions.ts`
- [ ] Update TrackComments.tsx imports
- [ ] Create `useAudioPlayer.ts`
- [ ] Create `useVersions.ts`
- [ ] Update TrackPlayer.tsx imports
- [ ] Verify: `npm run build` ✓

### Phase 2: API Boundaries (Week 2)
- [ ] Create `src/features/comments/index.ts`
- [ ] Create `src/features/comments/types/index.ts`
- [ ] Create `src/features/player/index.ts`
- [ ] Create `src/features/player/types/index.ts`
- [ ] Create `src/features/projects/index.ts`
- [ ] Create `src/features/projects/types/index.ts`
- [ ] Create `src/features/tracks/index.ts`
- [ ] Create `src/features/tracks/types/index.ts`
- [ ] Update all imports to use index.ts

### Phase 3: Rules & Validation (Week 3)
- [ ] Configure ESLint import rules
- [ ] Add no-internal-modules rule
- [ ] Document cross-feature policies
- [ ] Add unit tests for hooks

---

## 🚩 Cross-Feature Dependencies

| From | To | Type | Status |
|------|----|----|--------|
| TrackPlayer | TrackComments | Components | ⚠️ Acceptable |
| TrackHeader | UploadVersionBtn | Components | ⚠️ Needs refactor |

**Recommendation:** Pass UI components as props instead of direct imports

---

## 📈 Expected Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Avg component size | 217 lines | 120 lines | 🔻 45% |
| Max component size | 550 lines | 280 lines | 🔻 49% |
| useEffect per component | 5.5 | 1.5 | 🔻 73% |
| Test coverage potential | Low | High | 🔼 60% |
| Module coupling | High | Low | 🔻 |

---

## 🚀 Get Started Now

**Recommended First Task:** `src/features/comments/hooks/useComments.ts`

Why?
- ✅ Clearest business logic (CRUD)
- ✅ No dependencies on other features
- ✅ Highest immediate ROI (550 → 200 lines)
- ✅ Serves as template for other extractions

**Estimated Time:** 2-3 hours

---

## 📄 Full Documentation

Complete audit report: `CODEBASE_AUDIT.md`

Topics covered:
- Detailed component analysis
- Hook extraction specifications
- Week-by-week implementation plan
- Cross-feature dependency analysis
- Type definitions recommendations
- ESLint configuration examples
- Testing strategies

---

## 💬 Quick Q&A

**Q: Should TrackPlayer import TrackComments directly?**
A: ✅ Yes - TrackComments is a logical UI component for the player
   But expose it via `features/comments/index.ts` as public API

**Q: Why split Supabase calls into hooks?**
A: • Testability - Mock hooks instead of Supabase client
   • Reusability - Same logic in different components
   • Maintainability - Business logic separate from UI
   • Performance - Easier to optimize data fetching

**Q: When should I add unit tests?**
A: • For hooks: Immediately after extraction
   • For components: After stabilizing structure
   • Priority: High-impact hooks first (useComments, useAudioPlayer)

**Q: Can I do this incrementally?**
A: ✅ Yes, recommended approach:
   1. Extract TrackComments hooks (independent)
   2. Extract TrackPlayer hooks (can depend on TrackComments)
   3. Create index.ts files
   4. Extract other components

---

## 📌 Status: Ready to Start

✅ Architecture analyzed  
✅ Issues identified  
✅ Solutions documented  
✅ Timeline created  

**Next Step:** Begin Week 1 - Extract useComments Hook

---

*Generated: 2026-02-28*  
*Architecture: Feature-Based*  
*Health Status: Ready for Refactoring*
