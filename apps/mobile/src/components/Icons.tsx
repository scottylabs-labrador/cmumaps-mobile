import Svg, { Circle, Line, Path, Polyline, Rect } from "react-native-svg";

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export const SearchIcon = ({ size = 20, color = "#666666", strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth={strokeWidth} />
    <Line
      x1="16.5"
      y1="16.5"
      x2="21"
      y2="21"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  </Svg>
);

export const CloseIcon = ({ size = 18, color = "#666666", strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 6L6 18M6 6L18 18"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const PlusIcon = ({ size = 24, color = "#ffffff", strokeWidth = 2.4 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 5V19M5 12H19"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const ChevronLeftIcon = ({ size = 20, color = "#808080", strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15 18L9 12L15 6"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const ChevronDoubleLeftIcon = ({
  size = 18,
  color = "#ffffff",
  strokeWidth = 2.2,
}: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M11 17L6 12L11 7M18 17L13 12L18 7"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const ChevronDoubleRightIcon = ({
  size = 18,
  color = "#ffffff",
  strokeWidth = 2.2,
}: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M6 17L11 12L6 7M13 17L18 12L13 7"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const ArrowRightIcon = ({ size = 20, color = "#ffffff", strokeWidth = 2.2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M5 12H19M19 12L12 5M19 12L12 19"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const ShareIcon = ({ size = 19, color = "#1e1e1e", strokeWidth = 1.9 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 12V19C4 20.1 4.9 21 6 21H18C19.1 21 20 20.1 20 19V12M16 6L12 2M12 2L8 6M12 2V15"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const TargetIcon = ({ size = 20, color = "#0e96d1", strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="7" stroke={color} strokeWidth={strokeWidth} />
    <Circle cx="12" cy="12" r="2.2" fill={color} />
    <Path
      d="M12 2V5M12 19V22M2 12H5M19 12H22"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  </Svg>
);

export const PinIcon = ({ size = 20, color = "#c4213e", strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 21C15.5 17.4 19 14.2 19 10.2C19 6.2 15.9 3 12 3C8.1 3 5 6.2 5 10.2C5 14.2 8.5 17.4 12 21Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx="12" cy="10" r="2.5" stroke={color} strokeWidth={strokeWidth} />
  </Svg>
);

export const SwapIcon = ({ size = 18, color = "#666666", strokeWidth = 1.9 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M7 4V17M7 4L4 7M7 4L10 7M17 20V7M17 20L14 17M17 20L20 17"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const BuildingIcon = ({ size = 19, color = "#666666", strokeWidth = 1.8 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect
      x="4"
      y="3"
      width="16"
      height="18"
      rx="2"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
    <Path
      d="M9 21V16H15V21M8 7H10M14 7H16M8 11H10M14 11H16"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  </Svg>
);

export const DoorIcon = ({ size = 18, color = "#666666", strokeWidth = 1.8 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M5 21H19M7 21V5C7 3.9 7.9 3 9 3H15C16.1 3 17 3.9 17 5V21"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx="14" cy="12" r="1" fill={color} />
  </Svg>
);

export const LayersIcon = ({ size = 20, color = "#ffffff", strokeWidth = 1.9 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 3L3 8L12 13L21 8L12 3Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M3 13L12 18L21 13"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const ZapIcon = ({ size = 19, color = "#0a6b94", strokeWidth = 1.9 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M13 2L4 14H12L11 22L20 10H12L13 2Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const UserIcon = ({ size = 22, color = "#ffffff", strokeWidth = 1.9 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth={strokeWidth} />
    <Path
      d="M4 20C4 16.7 7.6 14 12 14C16.4 14 20 16.7 20 20"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  </Svg>
);

export const LogOutIcon = ({ size = 20, color = "#1e1e1e", strokeWidth = 1.9 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 21H5C3.9 21 3 20.1 3 19V5C3 3.9 3.9 3 5 3H9M16 17L21 12M21 12L16 7M21 12H9"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const LogInIcon = ({ size = 22, color = "#ffffff", strokeWidth = 1.9 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15 3H19C20.1 3 21 3.9 21 5V19C21 20.1 20.1 21 19 21H15M10 17L15 12M15 12L10 7M15 12H3"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const DirectionArrowIcon = ({
  action,
  size = 44,
  color = "#ffffff",
}: {
  action: string;
  size?: number;
  color?: string;
}) => {
  const normalized = action.toLowerCase();
  if (normalized.includes("left")) {
    return (
      <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <Path
          d="M32 40V22C32 18.7 29.3 16 26 16H12"
          stroke={color}
          strokeWidth={4.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Polyline
          points="19,9 11,16 19,23"
          stroke={color}
          strokeWidth={4.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }
  if (normalized.includes("right")) {
    return (
      <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <Path
          d="M16 40V22C16 18.7 18.7 16 22 16H36"
          stroke={color}
          strokeWidth={4.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Polyline
          points="29,9 37,16 29,23"
          stroke={color}
          strokeWidth={4.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }
  if (
    normalized.includes("back") ||
    normalized.includes("around") ||
    normalized.includes("u-turn")
  ) {
    return (
      <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <Path
          d="M32 40V20C32 14.5 27.5 10 22 10C16.5 10 12 14.5 12 20V32"
          stroke={color}
          strokeWidth={4.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Polyline
          points="5,25 12,33 19,25"
          stroke={color}
          strokeWidth={4.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Path d="M24 40V10" stroke={color} strokeWidth={4.5} strokeLinecap="round" />
      <Polyline
        points="14,19 24,9 34,19"
        stroke={color}
        strokeWidth={4.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};
