import React from "react";
import { Image } from "react-native";
import Svg, { Path, Rect, Circle } from "react-native-svg";

export type IconVariant = "outline" | "filled";

export interface IconProps {
  size?: number;
  color?: string;
  variant?: IconVariant;
}

export type IconName =
  | "home" | "search" | "explore" | "categories" | "library" | "heart"
  | "profile" | "settings" | "menu" | "arrow-back" | "arrow-forward" | "close"
  | "download" | "upload" | "share" | "copy" | "edit" | "delete"
  | "bookmark" | "add" | "refresh" | "filter" | "sort" | "more"
  | "chat" | "send" | "bell" | "mic" | "voice" | "camera" | "image" | "attachment"
  | "play" | "pause" | "next" | "previous" | "volume" | "mute" | "fullscreen"
  | "user" | "login" | "logout" | "lock" | "unlock" | "eye" | "eye-off" | "shield" | "privacy";

interface IconDef {
  outline: (color: string) => React.ReactNode;
  filled: (color: string) => React.ReactNode;
}

const FLATICON_ASSETS: Partial<Record<IconName, any>> = {
  home: require("../../assets/flaticon/home.png"),
  library: require("../../assets/flaticon/calendar.png"),
  edit: require("../../assets/flaticon/edit.png"),
  categories: require("../../assets/flaticon/project.png"),
  user: require("../../assets/flaticon/user.png"),
  profile: require("../../assets/flaticon/user.png"),
};

const ICON_REGISTRY: Record<IconName, IconDef> = {
  home: {
    outline: (c) => <Path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9.5Z" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
    filled: (c) => <Path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9.5Z" fill={c} />,
  },
  search: {
    outline: (c) => (
      <>
        <Circle cx="11" cy="11" r="7" stroke={c} strokeWidth="2" fill="none" />
        <Path d="m20 20-3.5-3.5" stroke={c} strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    filled: (c) => (
      <>
        <Circle cx="11" cy="11" r="7" fill={c} />
        <Path d="m20 20-3.5-3.5" stroke={c} strokeWidth="2.5" strokeLinecap="round" />
      </>
    ),
  },
  explore: {
    outline: (c) => (
      <>
        <Circle cx="12" cy="12" r="9" stroke={c} strokeWidth="2" fill="none" />
        <Path d="m14.5 9.5-2 5-5 2 2-5 5-2Z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" fill="none" />
      </>
    ),
    filled: (c) => (
      <>
        <Circle cx="12" cy="12" r="9" fill={c} opacity={0.2} />
        <Circle cx="12" cy="12" r="9" stroke={c} strokeWidth="2" fill="none" />
        <Path d="m14.5 9.5-2 5-5 2 2-5 5-2Z" fill={c} />
      </>
    ),
  },
  categories: {
    outline: (c) => (
      <>
        <Rect x="3" y="3" width="7" height="7" rx="2" stroke={c} strokeWidth="2" fill="none" />
        <Rect x="14" y="3" width="7" height="7" rx="2" stroke={c} strokeWidth="2" fill="none" />
        <Rect x="3" y="14" width="7" height="7" rx="2" stroke={c} strokeWidth="2" fill="none" />
        <Rect x="14" y="14" width="7" height="7" rx="2" stroke={c} strokeWidth="2" fill="none" />
      </>
    ),
    filled: (c) => (
      <>
        <Rect x="3" y="3" width="7" height="7" rx="2" fill={c} />
        <Rect x="14" y="3" width="7" height="7" rx="2" fill={c} />
        <Rect x="3" y="14" width="7" height="7" rx="2" fill={c} />
        <Rect x="14" y="14" width="7" height="7" rx="2" fill={c} />
      </>
    ),
  },
  library: {
    outline: (c) => (
      <>
        <Path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" />
        <Path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke={c} strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    filled: (c) => (
      <>
        <Path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" fill={c} />
        <Path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
      </>
    ),
  },
  heart: {
    outline: (c) => <Path d="M12 21s-6.5-4.3-9-8.5C1 8.5 3 4.5 7.5 4.5c2.5 0 4 2 4.5 3 .5-1 2-3 4.5-3C21 4.5 23 8.5 21 12.5c-2.5 4.2-9 8.5-9 8.5Z" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
    filled: (c) => <Path d="M12 21s-6.5-4.3-9-8.5C1 8.5 3 4.5 7.5 4.5c2.5 0 4 2 4.5 3 .5-1 2-3 4.5-3C21 4.5 23 8.5 21 12.5c-2.5 4.2-9 8.5-9 8.5Z" fill={c} />,
  },
  profile: {
    outline: (c) => (
      <>
        <Circle cx="12" cy="7" r="4" stroke={c} strokeWidth="2" fill="none" />
        <Path d="M4 20c0-4 3.5-6 8-6s8 2 8 6" stroke={c} strokeWidth="2" strokeLinecap="round" fill="none" />
      </>
    ),
    filled: (c) => (
      <>
        <Circle cx="12" cy="7" r="4" fill={c} />
        <Path d="M4 20c0-4 3.5-6 8-6s8 2 8 6" fill={c} />
      </>
    ),
  },
  settings: {
    outline: (c) => (
      <>
        <Circle cx="12" cy="12" r="3" stroke={c} strokeWidth="2" fill="none" />
        <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" stroke={c} strokeWidth="1.8" fill="none" />
      </>
    ),
    filled: (c) => (
      <>
        <Circle cx="12" cy="12" r="3" fill="#ffffff" />
        <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" fill={c} />
      </>
    ),
  },
  menu: {
    outline: (c) => <Path d="M4 6h16M4 12h16M4 18h16" stroke={c} strokeWidth="2" strokeLinecap="round" />,
    filled: (c) => <Path d="M4 5h16a1 1 0 0 1 0 2H4a1 1 0 0 1 0-2Zm0 6h16a1 1 0 0 1 0 2H4a1 1 0 0 1 0-2Zm0 6h16a1 1 0 0 1 0 2H4a1 1 0 0 1 0-2Z" fill={c} />,
  },
  "arrow-back": {
    outline: (c) => <Path d="M19 12H5M12 19l-7-7 7-7" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
    filled: (c) => <Path d="M19 12H5M12 19l-7-7 7-7" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />,
  },
  "arrow-forward": {
    outline: (c) => <Path d="M5 12h14M12 5l7 7-7 7" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
    filled: (c) => <Path d="M5 12h14M12 5l7 7-7 7" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />,
  },
  close: {
    outline: (c) => <Path d="M18 6 6 18M6 6l12 12" stroke={c} strokeWidth="2" strokeLinecap="round" />,
    filled: (c) => (
      <>
        <Circle cx="12" cy="12" r="9" fill={c} />
        <Path d="m15 9-6 6M9 9l6 6" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
      </>
    ),
  },
  download: {
    outline: (c) => <Path d="M12 3v12M7 10l5 5 5-5M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
    filled: (c) => (
      <>
        <Path d="M12 3v12M7 10l5 5 5-5" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <Rect x="4" y="17" width="16" height="4" rx="2" fill={c} />
      </>
    ),
  },
  upload: {
    outline: (c) => <Path d="M12 15V3M7 8l5-5 5 5M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
    filled: (c) => (
      <>
        <Path d="M12 15V3M7 8l5-5 5 5" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <Rect x="4" y="17" width="16" height="4" rx="2" fill={c} />
      </>
    ),
  },
  share: {
    outline: (c) => (
      <>
        <Circle cx="18" cy="5" r="3" stroke={c} strokeWidth="2" fill="none" />
        <Circle cx="6" cy="12" r="3" stroke={c} strokeWidth="2" fill="none" />
        <Circle cx="18" cy="19" r="3" stroke={c} strokeWidth="2" fill="none" />
        <Path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" stroke={c} strokeWidth="2" />
      </>
    ),
    filled: (c) => (
      <>
        <Circle cx="18" cy="5" r="3" fill={c} />
        <Circle cx="6" cy="12" r="3" fill={c} />
        <Circle cx="18" cy="19" r="3" fill={c} />
        <Path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" stroke={c} strokeWidth="2.5" />
      </>
    ),
  },
  copy: {
    outline: (c) => (
      <>
        <Rect x="8" y="8" width="12" height="12" rx="2" stroke={c} strokeWidth="2" fill="none" />
        <Path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" stroke={c} strokeWidth="2" strokeLinecap="round" fill="none" />
      </>
    ),
    filled: (c) => (
      <>
        <Rect x="8" y="8" width="12" height="12" rx="2" fill={c} />
        <Path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" stroke={c} strokeWidth="2" strokeLinecap="round" fill="none" />
      </>
    ),
  },
  edit: {
    outline: (c) => <Path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
    filled: (c) => <Path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z" fill={c} />,
  },
  delete: {
    outline: (c) => (
      <>
        <Path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </>
    ),
    filled: (c) => (
      <>
        <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" fill={c} />
        <Path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke={c} strokeWidth="2" strokeLinecap="round" />
        <Path d="M10 11v6M14 11v6" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
  },
  bookmark: {
    outline: (c) => <Path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
    filled: (c) => <Path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z" fill={c} />,
  },
  add: {
    outline: (c) => <Path d="M12 5v14M5 12h14" stroke={c} strokeWidth="2" strokeLinecap="round" />,
    filled: (c) => (
      <>
        <Circle cx="12" cy="12" r="9" fill={c} />
        <Path d="M12 8v8M8 12h8" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
  },
  refresh: {
    outline: (c) => (
      <>
        <Path d="M21.5 2v6h-6M2.5 22v-6h6" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M20 11.5A8.5 8.5 0 0 0 5.6 6.8L2.5 8M4 12.5a8.5 8.5 0 0 0 14.4 4.7l3.1-2.2" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </>
    ),
    filled: (c) => (
      <>
        <Path d="M21.5 2v6h-6M2.5 22v-6h6" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M20 11.5A8.5 8.5 0 0 0 5.6 6.8L2.5 8M4 12.5a8.5 8.5 0 0 0 14.4 4.7l3.1-2.2" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </>
    ),
  },
  filter: {
    outline: (c) => <Path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3Z" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
    filled: (c) => <Path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3Z" fill={c} />,
  },
  sort: {
    outline: (c) => <Path d="M3 6h18M6 12h12M10 18h4" stroke={c} strokeWidth="2" strokeLinecap="round" />,
    filled: (c) => <Path d="M3 6h18M6 12h12M10 18h4" stroke={c} strokeWidth="2.5" strokeLinecap="round" />,
  },
  more: {
    outline: (c) => (
      <>
        <Circle cx="12" cy="12" r="1.5" fill={c} />
        <Circle cx="19" cy="12" r="1.5" fill={c} />
        <Circle cx="5" cy="12" r="1.5" fill={c} />
      </>
    ),
    filled: (c) => (
      <>
        <Circle cx="12" cy="12" r="2" fill={c} />
        <Circle cx="19" cy="12" r="2" fill={c} />
        <Circle cx="5" cy="12" r="2" fill={c} />
      </>
    ),
  },
  chat: {
    outline: (c) => <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10Z" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
    filled: (c) => <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10Z" fill={c} />,
  },
  send: {
    outline: (c) => <Path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
    filled: (c) => <Path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" fill={c} />,
  },
  bell: {
    outline: (c) => (
      <>
        <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </>
    ),
    filled: (c) => (
      <>
        <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" fill={c} />
        <Path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={c} strokeWidth="2" strokeLinecap="round" />
      </>
    ),
  },
  mic: {
    outline: (c) => (
      <>
        <Rect x="9" y="2" width="6" height="12" rx="3" stroke={c} strokeWidth="2" fill="none" />
        <Path d="M5 10v1a7 7 0 0 0 14 0v-1M12 18v4M8 22h8" stroke={c} strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    filled: (c) => (
      <>
        <Rect x="9" y="2" width="6" height="12" rx="3" fill={c} />
        <Path d="M5 10v1a7 7 0 0 0 14 0v-1M12 18v4M8 22h8" stroke={c} strokeWidth="2" strokeLinecap="round" />
      </>
    ),
  },
  voice: {
    outline: (c) => <Path d="M12 3v18M8 6v12M16 6v12M4 9v6M20 9v6" stroke={c} strokeWidth="2" strokeLinecap="round" />,
    filled: (c) => <Path d="M12 3v18M8 6v12M16 6v12M4 9v6M20 9v6" stroke={c} strokeWidth="2.5" strokeLinecap="round" />,
  },
  camera: {
    outline: (c) => (
      <>
        <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2v11Z" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx="12" cy="13" r="4" stroke={c} strokeWidth="2" fill="none" />
      </>
    ),
    filled: (c) => (
      <>
        <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2v11Z" fill={c} />
        <Circle cx="12" cy="13" r="4" fill="#ffffff" />
      </>
    ),
  },
  image: {
    outline: (c) => (
      <>
        <Rect x="3" y="3" width="18" height="18" rx="2" stroke={c} strokeWidth="2" fill="none" />
        <Circle cx="8.5" cy="8.5" r="1.5" fill={c} />
        <Path d="m21 15-5-5L5 21" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
    filled: (c) => (
      <>
        <Rect x="3" y="3" width="18" height="18" rx="2" fill={c} />
        <Circle cx="8.5" cy="8.5" r="1.5" fill="#ffffff" />
        <Path d="m21 15-5-5L5 21" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
  attachment: {
    outline: (c) => <Path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
    filled: (c) => <Path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  },
  play: {
    outline: (c) => <Path d="m5 3 14 9-14 9V3Z" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
    filled: (c) => <Path d="m5 3 14 9-14 9V3Z" fill={c} />,
  },
  pause: {
    outline: (c) => <Path d="M6 4h4v16H6zM14 4h4v16h-4z" stroke={c} strokeWidth="2" strokeLinecap="round" fill="none" />,
    filled: (c) => (
      <>
        <Rect x="6" y="4" width="4" height="16" rx="1" fill={c} />
        <Rect x="14" y="4" width="4" height="16" rx="1" fill={c} />
      </>
    ),
  },
  next: {
    outline: (c) => <Path d="m5 4 10 8-10 8V4zM19 5v14" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
    filled: (c) => (
      <>
        <Path d="m5 4 10 8-10 8V4z" fill={c} />
        <Path d="M19 5v14" stroke={c} strokeWidth="2.5" strokeLinecap="round" />
      </>
    ),
  },
  previous: {
    outline: (c) => <Path d="m19 20-10-8 10-8v16zM5 19V5" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
    filled: (c) => (
      <>
        <Path d="m19 20-10-8 10-8v16z" fill={c} />
        <Path d="M5 19V5" stroke={c} strokeWidth="2.5" strokeLinecap="round" />
      </>
    ),
  },
  volume: {
    outline: (c) => (
      <>
        <Path d="M11 5 6 9H2v6h4l5 4V5Z" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" stroke={c} strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    filled: (c) => (
      <>
        <Path d="M11 5 6 9H2v6h4l5 4V5Z" fill={c} />
        <Path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" stroke={c} strokeWidth="2" strokeLinecap="round" />
      </>
    ),
  },
  mute: {
    outline: (c) => (
      <>
        <Path d="M11 5 6 9H2v6h4l5 4V5ZM23 9l-6 6M17 9l6 6" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </>
    ),
    filled: (c) => (
      <>
        <Path d="M11 5 6 9H2v6h4l5 4V5Z" fill={c} />
        <Path d="m23 9-6 6M17 9l6 6" stroke={c} strokeWidth="2" strokeLinecap="round" />
      </>
    ),
  },
  fullscreen: {
    outline: (c) => <Path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
    filled: (c) => <Path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />,
  },
  user: {
    outline: (c) => (
      <>
        <Circle cx="12" cy="7" r="4" stroke={c} strokeWidth="2" fill="none" />
        <Path d="M4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2" stroke={c} strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    filled: (c) => (
      <>
        <Circle cx="12" cy="7" r="4" fill={c} />
        <Path d="M4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2" fill={c} />
      </>
    ),
  },
  login: {
    outline: (c) => <Path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
    filled: (c) => <Path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  },
  logout: {
    outline: (c) => <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
    filled: (c) => <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  },
  lock: {
    outline: (c) => (
      <>
        <Rect x="3" y="11" width="18" height="11" rx="2" stroke={c} strokeWidth="2" fill="none" />
        <Path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={c} strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    filled: (c) => (
      <>
        <Rect x="3" y="11" width="18" height="11" rx="2" fill={c} />
        <Path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={c} strokeWidth="2" strokeLinecap="round" />
      </>
    ),
  },
  unlock: {
    outline: (c) => (
      <>
        <Rect x="3" y="11" width="18" height="11" rx="2" stroke={c} strokeWidth="2" fill="none" />
        <Path d="M7 11V7a5 5 0 0 1 9.9-1" stroke={c} strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    filled: (c) => (
      <>
        <Rect x="3" y="11" width="18" height="11" rx="2" fill={c} />
        <Path d="M7 11V7a5 5 0 0 1 9.9-1" stroke={c} strokeWidth="2" strokeLinecap="round" />
      </>
    ),
  },
  eye: {
    outline: (c) => (
      <>
        <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Circle cx="12" cy="12" r="3" stroke={c} strokeWidth="2" fill="none" />
      </>
    ),
    filled: (c) => (
      <>
        <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" fill={c} />
        <Circle cx="12" cy="12" r="3" fill="#ffffff" />
      </>
    ),
  },
  "eye-off": {
    outline: (c) => (
      <>
        <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
    filled: (c) => (
      <>
        <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
  shield: {
    outline: (c) => <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
    filled: (c) => <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" fill={c} />,
  },
  privacy: {
    outline: (c) => (
      <>
        <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Path d="M12 8v4" stroke={c} strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    filled: (c) => (
      <>
        <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" fill={c} />
        <Path d="M12 8v4" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
  },
};

export const AppIcon: React.FC<{
  name: IconName;
  variant?: IconVariant;
  size?: number;
  color?: string;
}> = ({ name, variant = "outline", size = 24, color = "#1c1c1e" }) => {
  const flaticonAsset = FLATICON_ASSETS[name];
  if (flaticonAsset) {
    return (
      <Image
        source={flaticonAsset}
        resizeMode="contain"
        style={{ width: size, height: size, tintColor: color }}
      />
    );
  }
  const iconDef = ICON_REGISTRY[name] || ICON_REGISTRY.categories;
  const renderer = variant === "filled" ? iconDef.filled : iconDef.outline;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {renderer(color)}
    </Svg>
  );
};
