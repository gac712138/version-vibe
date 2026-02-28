// Player feature types
export interface Version {
  id: string;
  version_number: number;
  name: string;
  created_at: string;
  storage_path: string;
  comment_count?: { count: number }[];
}

export interface AudioState {
  currentVersion: Version | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isMuted: boolean;
  assetVolumes: Record<string, number>;
}

export interface AudioControls {
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  selectVersion: (id: string) => void;
  setVolume: (value: number) => void;
  toggleMute: () => void;

  handleTimeUpdate: (versionId: string, time: number) => void;
  handleLoadedMetadata: (versionId: string, duration: number) => void;
  handleEnded: (versionId: string) => void;
}

export interface UseAudioEngineOptions {
  versions: Version[];
  initialVersionId?: string;
}

export interface UseAudioEngineReturn extends AudioState, AudioControls {
  versions: Version[];
  audioRefs: React.MutableRefObject<Record<string, HTMLAudioElement>>;
  setVersions: React.Dispatch<React.SetStateAction<Version[]>>;
}
  setVersions: React.Dispatch<React.SetStateAction<Version[]>>; // optional passthrough
