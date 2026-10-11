import { getBaseExerciseName, isUnilateralName } from "@/app/lib/exerciseVariant";

type Props = {
  name: string;
  /** Classes of the name text, including `truncate` where the name may be cut off. */
  className?: string;
};

// Exercise name for lists where it may be truncated: the unilateral marker is
// rendered as a fixed tag next to the name instead of as its (cut-off) ending.
export default function ExerciseName({ name, className }: Props) {
  if (!isUnilateralName(name)) return <p className={className}>{name}</p>;

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <p className={`min-w-0 ${className ?? ""}`}>{getBaseExerciseName(name)}</p>
      <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-zinc-800 text-[10px] font-bold text-zinc-300">
        Uni
      </span>
    </div>
  );
}
