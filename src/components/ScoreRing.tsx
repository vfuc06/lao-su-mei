import React from 'react';

interface ScoreRingProps {
  score: number;
  passThreshold?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const ScoreRing: React.FC<ScoreRingProps> = ({
  score,
  passThreshold = 80,
  size = 'md',
}) => {
  const isPassed = score >= passThreshold;
  const isWarning = score >= 60 && score < passThreshold;

  const colorClasses = isPassed
    ? { stroke: 'stroke-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' }
    : isWarning
    ? { stroke: 'stroke-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' }
    : { stroke: 'stroke-rose-500', text: 'text-rose-700', bg: 'bg-rose-50' };

  const dimensions = {
    sm: { size: 48, strokeWidth: 4, textSize: 'text-xs', subSize: 'text-[8px]' },
    md: { size: 68, strokeWidth: 5, textSize: 'text-base', subSize: 'text-[9px]' },
    lg: { size: 92, strokeWidth: 7, textSize: 'text-xl', subSize: 'text-[11px]' },
  }[size];

  const radius = (dimensions.size - dimensions.strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={dimensions.size}
        height={dimensions.size}
        className="transform -rotate-90"
      >
        {/* Vòng nền */}
        <circle
          cx={dimensions.size / 2}
          cy={dimensions.size / 2}
          r={radius}
          className="stroke-stone-200"
          strokeWidth={dimensions.strokeWidth}
          fill="transparent"
        />
        {/* Vòng tiến trình */}
        <circle
          cx={dimensions.size / 2}
          cy={dimensions.size / 2}
          r={radius}
          className={`${colorClasses.stroke} transition-all duration-700 ease-out`}
          strokeWidth={dimensions.strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
        />
      </svg>
      {/* Hiển thị số điểm ở giữa */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-black ${dimensions.textSize} ${colorClasses.text} leading-none`}>
          {score}%
        </span>
        <span className={`font-semibold ${dimensions.subSize} text-stone-500 mt-0.5`}>
          {isPassed ? 'Đạt' : 'Chưa đạt'}
        </span>
      </div>
    </div>
  );
};
