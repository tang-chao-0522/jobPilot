import { BriefcaseBusiness } from 'lucide-react';

interface LogoProps {
  light?: boolean;
}

export function Logo({ light = false }: LogoProps) {
  return (
    <div className="flex items-center gap-3 font-bold text-xl">
      <span
        className={`w-10 h-10 rounded-xl grid place-items-center ${light ? 'bg-white text-brand' : 'bg-brand text-white'}`}
      >
        <BriefcaseBusiness size={21} />
      </span>
      JobPilot
    </div>
  );
}
