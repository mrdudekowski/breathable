interface HourglassIconProps {
  className?: string;
  size?: number;
}

export const HourglassIcon = ({ className, size = 24 }: HourglassIconProps) => {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6 2H18V6L12 12L18 18V22H6V18L12 12L6 6V2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M12 12V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
};
