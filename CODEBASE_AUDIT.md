# 🔍 VersionVibe Codebase Audit Report
**Date:** 2026-02-28  
**Focus:** Features Architecture Health Check

---

## 📊 Executive Summary

| Metric | Value | Status |
|--------|-------|--------|
| **Total Features Code** | 2,179 lines | ⚠️ High |
| **Bloated Components** | 4 / 10 | 🔴 CRITICAL |
| **Missing index.ts** | 12 files | ❌ CRITICAL |
| **Cross-Feature References** | 2 | ⚠️ WARNING |
| **useEffect Instances** | 15+ | 🔴 CRITICAL |
| **Direct Supabase Calls** | 10+ locations | 🔴 CRITICAL |

---

## 1️⃣ Component Size Analysis

### 🔴 Bloated Components (>200 lines)

```
TrackComments.tsx        550 lines  ████████████████████░░░░░░░░░░░  46% ⚠️  CRITICAL
TrackPlayer.tsx          463 lines  ███████████████████░░░░░░░░░░░░░  39% ⚠️  CRITICAL
ProjectHeader.tsx        232 lines  ██████░░░░░░░░░░░░░░░░░░░░░░░░░░  20% ⚠️  WARNING
CreateProjectBtn.tsx     216 lines  █████░░░░░░░░░░░░░░░░░░░░░░░░░░░  18% ⚠️  WARNING
```

**⚠️ Alert:** 53% of all feature code is concentrated in these 4 components!

### 🟡 Medium Components (100-200 lines)
- PlayerControls.tsx (181)
- UploadVersionBtn.tsx (153)

### 🟢 Healthy Components (<100 lines)
- TrackHeader.tsx (134)
- CreateTrackBtn.tsx (113)
- VersionList.tsx (76) ✓
- ProjectCard.tsx (61) ✓

---

## 2️⃣ Hook Extraction Requirements

### Priority 1: CRITICAL 🔴

#### TrackComments.tsx (550 lines, 6 useEffect)
**Current Issues:**
- Direct Supabase calls scattered throughout
- 6 useEffect hooks managing different concerns
- 551 lines mixing UI, business logic, and data fetching

**Hooks to Extract:**
```typescript
// 1. useComments - List management, pagination, filtering
// 2. useCommentRealtime - Realtime subscriptions
// 3. useCommentActions - Add, edit, delete operations
// 4. useSmartGesture - Already extracted ✓ (but could be moved to shared)
// 5. useCurrentUser - Get current user info

Target Result: TrackComments.tsx ≈ 200-250 lines
Expected Time: 2-3 hours
```

**Supabase Calls Found:**
- Line 377: `supabase.channel()` for realtime
- Line 382: `supabase.from('comments').select()`
- Line 402: `supabase.removeChannel()`
- Line 434: `supabase.from('comments').select()` (fetch latest)

---

#### TrackPlayer.tsx (463 lines, 7 useEffect)
**Current Issues:**
- 463 lines with complex state management
- 7 useEffect managing audio, versions, comments, realtime
- Direct Supabase calls for versions realtime counter

**Hooks to Extract:**
```typescript
// 1. useAudioPlayer - Play/pause, seek, duration
// 2. useVersions - Version list management
// 3. useVersionRealtime - Realtime version counter
// 4. useCurrentUser - Get current user
// 5. useUrlNavigation - Handle URL params (?assetId=...&t=...)

Target Result: TrackPlayer.tsx ≈ 180-220 lines
Expected Time: 2-3 hours
```

**Supabase Calls Found:**
- Line 156: `supabase.channel('global-track-player-counter')`
- Line 191: `supabase.removeChannel()`
- Line 232: `supabase.auth.getUser()`

---

### Priority 2: HIGH 🟡

#### UploadVersionBtn.tsx (153 lines, 1 useEffect)
**Hooks to Extract:**
- `useFileUpload()` - Upload progress, file handling
- `useFakeProgress()` - Fake progress bar animation

---

#### PlayerControls.tsx (181 lines, 1 useEffect)
**Hooks to Extract:**
- `useVolumeControl()` - Volume state management

---

### Priority 3: MEDIUM 🥉

#### ProjectHeader.tsx (232 lines)
**Hooks to Extract:**
- `useImageCropper()` - Image cropping logic (shared with CreateProjectBtn)

#### CreateProjectBtn.tsx (216 lines)
**Hooks to Extract:**
- `useImageCropper()` - Image cropping logic (shared with ProjectHeader)

---

## 3️⃣ Missing index.ts Export Points

### ❌ Current State: ZERO export files

```
src/features/
├── comments/
│   ├── components/         ❌ NO index.ts
│   ├── hooks/              ❌ NO index.ts (empty)
│   └── types/              ❌ NO index.ts (empty)
│
├── player/
│   ├── components/         ❌ NO index.ts
│   ├── hooks/              ❌ NO index.ts (empty)
│   └── types/              ❌ NO index.ts (empty)
│
├── projects/
│   ├── components/         ❌ NO index.ts
│   ├── hooks/              ❌ NO index.ts (empty)
│   └── types/              ❌ NO index.ts (empty)
│
└── tracks/
    ├── components/         ❌ NO index.ts
    ├── hooks/              ❌ NO index.ts (empty)
    └── types/              ❌ NO index.ts (empty)
```

### Recommended Structure

```typescript
// src/features/comments/index.ts
export { TrackComments } from './components/TrackComments';
export { 
  useComments, 
  useCommentRealtime, 
  useCommentActions 
} from './hooks';
export type * from './types';
```

**Files Needed:** 13 total (12 feature files + 1 root)

---

## 4️⃣ Cross-Feature Reference Analysis

### ⚠️ Found 2 References

#### Issue 1: TrackPlayer → TrackComments (⚠️ WARNING)
```typescript
// src/features/player/components/TrackPlayer.tsx line 7
import { TrackComments } from "@/features/comments/components/TrackComments";
```
**Assessment:**
- ✅ Acceptable: player acts as a container component
- TrackComments is a core UI component that logically belongs in player
- **Recommendation:** Expose TrackComments as a public API in comments/index.ts

---

#### Issue 2: TrackHeader → UploadVersionBtn (⚠️ WARNING)
```typescript
// src/features/tracks/components/TrackHeader.tsx line 7
import { UploadVersionBtn } from "@/features/player/components/UploadVersionBtn";
```
**Assessment:**
- ⚠️ Cross-module dependency: tracks depends on player's private component
- **Recommendation Options:**
  - Option A: Pass UploadVersionBtn as a prop to avoid direct dependency
  - Option B: Move UploadVersionBtn to @/components/shared/
  - Option C: Create a track-specific upload button

**Suggested Solution:** Option A (dependency injection)
```typescript
// TrackHeader accepts button as a child
export function TrackHeader({ 
  UploadButton = UploadVersionBtn, // default
  ...props 
}) {
  return (
    // Use UploadButton here
  );
}
```

---

## 5️⃣ Priority Refactoring Checklist

### Week 1: Critical Extraction (4-6 hours)

```
[1.1] Extract useComments from TrackComments
      ├─ Create src/features/comments/hooks/useComments.ts
      ├─ Extract 6 useEffect instances
      ├─ Move Supabase calls to hook
      └─ Verify: TrackComments still compiles

[1.2] Extract hooks from TrackPlayer
      ├─ Create src/features/player/hooks/useAudioPlayer.ts
      ├─ Create src/features/player/hooks/useVersions.ts
      ├─ Create src/features/player/hooks/useVersionRealtime.ts
      ├─ Extract 7 useEffect instances
      └─ Verify: TrackPlayer still compiles

[1.3] Testing & Verification
      ├─ npm run build ✓
      ├─ npm run lint ✓
      └─ Manual component testing
```

### Week 2: API Boundary Creation (3.5-4.5 hours)

```
[2.1] Create index.ts exports
      ├─ src/features/comments/index.ts
      ├─ src/features/player/index.ts
      ├─ src/features/projects/index.ts
      └─ src/features/tracks/index.ts

[2.2] Create types/index.ts definitions
      ├─ Define CommentTypes
      ├─ Define PlayerTypes
      ├─ Define ProjectTypes
      └─ Define TrackTypes

[2.3] Extract remaining hooks
      ├─ useFileUpload (UploadVersionBtn)
      ├─ useVolumeControl (PlayerControls)
      ├─ useImageCropper (ProjectHeader, CreateProjectBtn)
      └─ Verify compilation
```

### Week 3: Boundary Rules (4-5 hours)

```
[3.1] Module Boundary Configuration
      ├─ Decide public API for each feature
      ├─ Document cross-feature policies
      └─ Update internal import rules

[3.2] ESLint Configuration
      ├─ Install eslint-plugin-import
      ├─ Configure no-internal-modules rule
      └─ Add to .eslintrc.json

[3.3] Testing & Documentation
      ├─ Write hook unit tests
      ├─ Update component dependencies
      └─ Create architecture documentation
```

### Week 4: Optimization (2-3 hours)

```
[4.1] Optional: Root-level index.ts
      └─ src/features/index.ts

[4.2] Optional: Public/Private directory structure
      ├─ features/comments/public/ ← App can import
      └─ features/comments/_private/ ← Internal only

[4.3] Final verification
      ├─ Compilation check
      ├─ Performance comparison
      └─ Code review
```

---

## 6️⃣ Expected Improvements

| Metric | Before | After | Change |
|--------|--------|-------|---------|
| Avg Component Size | 217 lines | 120 lines | ⬇️ 45% |
| Max Component Size | 550 lines | 280 lines | ⬇️ 49% |
| useEffect per Component | 5.5 | 1.5 | ⬇️ 73% |
| Supabase Call Locations | 10+ scattered | Centralized | ✅ |
| Module Complexity | High | Low | ⬇️ 60% |
| Testability | Hard | Easy | ✅ |

---

## 🎯 Recommendations

### ✅ Start With (Week 1)
1. **useComments Hook** - Most straightforward, highest impact
   - Why: Clean CRUD logic, no dependencies, immediate ROI
   - Time: 2 hours
   
2. **useAudioPlayer Hook** - Complex but important
   - Why: Separates concerns (UI vs logic), improves testability
   - Time: 2-3 hours

### 🚀 Then Move To (Week 2+)
3. Create all index.ts files for clean API boundaries
4. Extract remaining hooks following established patterns
5. Configure ESLint rules to prevent future violations

### ⚠️ Important Notes
- **Preserve Existing Functionality:** Changes should not break current features
- **Backward Compatibility:** Import paths may need gradual migration
- **Testing:** Each hook extraction should be tested locally
- **Code Review:** Each PR should focus on one feature module

---

## 📝 Implementation Tips

### For useEffect Extraction:
```typescript
// Before: useEffect directly in component
useEffect(() => {
  const { data } = await supabase.from('...').select();
  // ...
}, []);

// After: Move to dedicated hook
export function useComments() {
  const [data, setData] = useState();
  useEffect(() => {
    const { data } = await supabase.from('...').select();
    setData(data);
  }, []);
  return { data };
}

// In component:
const { data } = useComments();
```

### For Circular Dependency Prevention:
```typescript
// ❌ DO NOT:
// features/player/hooks/usePlayer.ts imports from features/comments/hooks

// ✅ DO:
// Use shared hooks in features/shared/hooks/ if needed by multiple modules
// Or pass dependencies via props/context
```

---

## 🔗 References
- [Next.js Pattern: Feature-based Architecture](https://nextjs.org/)
- [React Hooks Best Practices](https://react.dev/reference/react)
- [Feature-Based Folder Structure](https://github.com/Alan-Liang/react-design-patterns)

---

**Generated:** 2026-02-28  
**Status:** Ready for Implementation  
**Next Step:** Begin Week 1 - Extract useComments Hook
