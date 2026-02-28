#!/bin/bash

###############################################################################
# 🏗️ Feature-Based Architecture 重構腳本
# 作用：自動建立目錄結構並移動檔案
# 執行方式：bash refactor.sh
###############################################################################

# ✅ 設定顏色輸出（美化日誌）
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 📍 取得專案根目錄（執行此腳本的目錄）
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_DIR="$PROJECT_ROOT/src"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  🏗️  Feature-Based Architecture 重構腳本${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}📁 專案根目錄：${NC}$PROJECT_ROOT"
echo -e "${YELLOW}📁 Source 目錄：${NC}$SRC_DIR"
echo ""

###############################################################################
# 第一階段：建立目錄結構
###############################################################################

echo -e "${BLUE}▶️  第一階段：建立目錄結構${NC}"
echo ""

# 1️⃣ 建立 Comments 模塊目錄
echo -e "${YELLOW}創建 src/features/comments/... ${NC}"
mkdir -p "$SRC_DIR/features/comments/components"
mkdir -p "$SRC_DIR/features/comments/hooks"
mkdir -p "$SRC_DIR/features/comments/types"
echo -e "${GREEN}✅ Comments 模塊目錄已建立${NC}"

# 2️⃣ 建立 Player 模塊目錄
echo -e "${YELLOW}創建 src/features/player/... ${NC}"
mkdir -p "$SRC_DIR/features/player/components"
mkdir -p "$SRC_DIR/features/player/hooks"
mkdir -p "$SRC_DIR/features/player/types"
echo -e "${GREEN}✅ Player 模塊目錄已建立${NC}"

# 3️⃣ 建立 Projects 模塊目錄
echo -e "${YELLOW}創建 src/features/projects/... ${NC}"
mkdir -p "$SRC_DIR/features/projects/components"
mkdir -p "$SRC_DIR/features/projects/hooks"
mkdir -p "$SRC_DIR/features/projects/types"
echo -e "${GREEN}✅ Projects 模塊目錄已建立${NC}"

# 4️⃣ 建立 Tracks 模塊目錄
echo -e "${YELLOW}創建 src/features/tracks/... ${NC}"
mkdir -p "$SRC_DIR/features/tracks/components"
mkdir -p "$SRC_DIR/features/tracks/hooks"
mkdir -p "$SRC_DIR/features/tracks/types"
echo -e "${GREEN}✅ Tracks 模塊目錄已建立${NC}"

# 5️⃣ 建立 Shared 組件目錄
echo -e "${YELLOW}創建 src/components/shared/... ${NC}"
mkdir -p "$SRC_DIR/components/shared"
echo -e "${GREEN}✅ Shared 組件目錄已建立${NC}"

echo ""

###############################################################################
# 第二階段：移動檔案
###############################################################################

echo -e "${BLUE}▶️  第二階段：移動檔案${NC}"
echo ""

# 1️⃣ 移動 TrackComments.tsx
if [ -f "$SRC_DIR/components/track/TrackComments.tsx" ]; then
    echo -e "${YELLOW}移動 TrackComments.tsx... ${NC}"
    mv "$SRC_DIR/components/track/TrackComments.tsx" \
       "$SRC_DIR/features/comments/components/"
    echo -e "${GREEN}✅ TrackComments.tsx 已移動到 features/comments/components/${NC}"
else
    echo -e "${RED}❌ 找不到 src/components/track/TrackComments.tsx${NC}"
fi

# 2️⃣ 移動 TrackPlayer.tsx
if [ -f "$SRC_DIR/components/TrackPlayer.tsx" ]; then
    echo -e "${YELLOW}移動 TrackPlayer.tsx... ${NC}"
    mv "$SRC_DIR/components/TrackPlayer.tsx" \
       "$SRC_DIR/features/player/components/"
    echo -e "${GREEN}✅ TrackPlayer.tsx 已移動到 features/player/components/${NC}"
else
    echo -e "${RED}❌ 找不到 src/components/TrackPlayer.tsx${NC}"
fi

# 3️⃣ 移動 PlayerControls.tsx
if [ -f "$SRC_DIR/components/PlayerControls.tsx" ]; then
    echo -e "${YELLOW}移動 PlayerControls.tsx... ${NC}"
    mv "$SRC_DIR/components/PlayerControls.tsx" \
       "$SRC_DIR/features/player/components/"
    echo -e "${GREEN}✅ PlayerControls.tsx 已移動到 features/player/components/${NC}"
else
    echo -e "${RED}❌ 找不到 src/components/PlayerControls.tsx${NC}"
fi

# 4️⃣ 移動 VersionList.tsx
if [ -f "$SRC_DIR/components/VersionList.tsx" ]; then
    echo -e "${YELLOW}移動 VersionList.tsx... ${NC}"
    mv "$SRC_DIR/components/VersionList.tsx" \
       "$SRC_DIR/features/player/components/"
    echo -e "${GREEN}✅ VersionList.tsx 已移動到 features/player/components/${NC}"
else
    echo -e "${RED}❌ 找不到 src/components/VersionList.tsx${NC}"
fi

# 5️⃣ 移動 UploadVersionBtn.tsx
if [ -f "$SRC_DIR/components/UploadVersionBtn.tsx" ]; then
    echo -e "${YELLOW}移動 UploadVersionBtn.tsx... ${NC}"
    mv "$SRC_DIR/components/UploadVersionBtn.tsx" \
       "$SRC_DIR/features/player/components/"
    echo -e "${GREEN}✅ UploadVersionBtn.tsx 已移動到 features/player/components/${NC}"
else
    echo -e "${RED}❌ 找不到 src/components/UploadVersionBtn.tsx${NC}"
fi

# 6️⃣ 移動 ProjectCard.tsx
if [ -f "$SRC_DIR/components/ProjectCard.tsx" ]; then
    echo -e "${YELLOW}移動 ProjectCard.tsx... ${NC}"
    mv "$SRC_DIR/components/ProjectCard.tsx" \
       "$SRC_DIR/features/projects/components/"
    echo -e "${GREEN}✅ ProjectCard.tsx 已移動到 features/projects/components/${NC}"
else
    echo -e "${RED}❌ 找不到 src/components/ProjectCard.tsx${NC}"
fi

# 7️⃣ 移動 ProjectHeader.tsx
if [ -f "$SRC_DIR/components/ProjectHeader.tsx" ]; then
    echo -e "${YELLOW}移動 ProjectHeader.tsx... ${NC}"
    mv "$SRC_DIR/components/ProjectHeader.tsx" \
       "$SRC_DIR/features/projects/components/"
    echo -e "${GREEN}✅ ProjectHeader.tsx 已移動到 features/projects/components/${NC}"
else
    echo -e "${RED}❌ 找不到 src/components/ProjectHeader.tsx${NC}"
fi

# 8️⃣ 移動 CreateProjectBtn.tsx
if [ -f "$SRC_DIR/components/CreateProjectBtn.tsx" ]; then
    echo -e "${YELLOW}移動 CreateProjectBtn.tsx... ${NC}"
    mv "$SRC_DIR/components/CreateProjectBtn.tsx" \
       "$SRC_DIR/features/projects/components/"
    echo -e "${GREEN}✅ CreateProjectBtn.tsx 已移動到 features/projects/components/${NC}"
else
    echo -e "${RED}❌ 找不到 src/components/CreateProjectBtn.tsx${NC}"
fi

# 9️⃣ 移動 CreateTrackBtn.tsx
if [ -f "$SRC_DIR/components/CreateTrackBtn.tsx" ]; then
    echo -e "${YELLOW}移動 CreateTrackBtn.tsx... ${NC}"
    mv "$SRC_DIR/components/CreateTrackBtn.tsx" \
       "$SRC_DIR/features/tracks/components/"
    echo -e "${GREEN}✅ CreateTrackBtn.tsx 已移動到 features/tracks/components/${NC}"
else
    echo -e "${RED}❌ 找不到 src/components/CreateTrackBtn.tsx${NC}"
fi

# 🔟 移動 TrackHeader.tsx
if [ -f "$SRC_DIR/components/TrackHeader.tsx" ]; then
    echo -e "${YELLOW}移動 TrackHeader.tsx... ${NC}"
    mv "$SRC_DIR/components/TrackHeader.tsx" \
       "$SRC_DIR/features/tracks/components/"
    echo -e "${GREEN}✅ TrackHeader.tsx 已移動到 features/tracks/components/${NC}"
else
    echo -e "${RED}❌ 找不到 src/components/TrackHeader.tsx${NC}"
fi

# 1️⃣1️⃣ 移動 ImageCropper.tsx 到 shared
if [ -f "$SRC_DIR/components/ImageCropper.tsx" ]; then
    echo -e "${YELLOW}移動 ImageCropper.tsx... ${NC}"
    mv "$SRC_DIR/components/ImageCropper.tsx" \
       "$SRC_DIR/components/shared/"
    echo -e "${GREEN}✅ ImageCropper.tsx 已移動到 components/shared/${NC}"
else
    echo -e "${RED}❌ 找不到 src/components/ImageCropper.tsx${NC}"
fi

# 1️⃣2️⃣ 移動 GlobalLoading.tsx 到 shared
if [ -f "$SRC_DIR/components/GlobalLoading.tsx" ]; then
    echo -e "${YELLOW}移動 GlobalLoading.tsx... ${NC}"
    mv "$SRC_DIR/components/GlobalLoading.tsx" \
       "$SRC_DIR/components/shared/"
    echo -e "${GREEN}✅ GlobalLoading.tsx 已移動到 components/shared/${NC}"
else
    echo -e "${RED}❌ 找不到 src/components/GlobalLoading.tsx${NC}"
fi

echo ""

###############################################################################
# 第三階段：清理空目錄
###############################################################################

echo -e "${BLUE}▶️  第三階段：清理空目錄${NC}"
echo ""

# 1️⃣ 刪除 components/track 目錄（如果為空）
if [ -d "$SRC_DIR/components/track" ]; then
    if [ -z "$(ls -A "$SRC_DIR/components/track")" ]; then
        echo -e "${YELLOW}刪除空目錄 src/components/track/... ${NC}"
        rmdir "$SRC_DIR/components/track"
        echo -e "${GREEN}✅ 空目錄已刪除${NC}"
    else
        echo -e "${YELLOW}⚠️  src/components/track/ 目錄非空，保留${NC}"
    fi
fi

echo ""

###############################################################################
# 第四階段：驗證結果
###############################################################################

echo -e "${BLUE}▶️  第四階段：驗證結果${NC}"
echo ""

echo -e "${YELLOW}📋 確認目錄結構：${NC}"
echo ""

# 檢查 features 結構
if [ -d "$SRC_DIR/features" ]; then
    echo -e "${GREEN}✅ src/features/ 存在${NC}"
    
    for module in comments player projects tracks; do
        if [ -d "$SRC_DIR/features/$module/components" ]; then
            echo -e "${GREEN}   ✅ features/$module/components/ 存在${NC}"
        fi
        if [ -d "$SRC_DIR/features/$module/hooks" ]; then
            echo -e "${GREEN}   ✅ features/$module/hooks/ 存在${NC}"
        fi
        if [ -d "$SRC_DIR/features/$module/types" ]; then
            echo -e "${GREEN}   ✅ features/$module/types/ 存在${NC}"
        fi
    done
fi

echo ""

# 檢查 components/shared 結構
if [ -d "$SRC_DIR/components/shared" ]; then
    echo -e "${GREEN}✅ src/components/shared/ 存在${NC}"
fi

echo ""

# 檢查 components/ui 結構
if [ -d "$SRC_DIR/components/ui" ]; then
    echo -e "${GREEN}✅ src/components/ui/ 存在（已保留）${NC}"
fi

echo ""

###############################################################################
# 完成提示
###############################################################################

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ 重構完成！${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}📝 下一步步驟：${NC}"
echo ""
echo "1️⃣  更新所有 import 路徑"
echo "   例如：替換 '@/components/TrackPlayer' → '@/features/player/components/TrackPlayer'"
echo ""
echo "2️⃣  運行 TypeScript 編譯檢查"
echo "   npm run build"
echo ""
echo "3️⃣  運行 ESLint 檢查"
echo "   npm run lint"
echo ""
echo "4️⃣  檢查 git 狀態"
echo "   git status"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
