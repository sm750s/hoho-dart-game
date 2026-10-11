import { DIFFICULTY_LABELS } from "../family";
import type { Difficulty } from "../aim";

type ChoiceCardsProps<T extends string> = {
  label: string;
  value: T;
  options: readonly { value: T; label: string; description: string }[];
  disabled?: boolean;
  onChange: (value: T) => void;
};

export default function ChoiceCards<T extends string>({ label, value, options, disabled, onChange }: ChoiceCardsProps<T>) {
  return <fieldset className="choice-cards" disabled={disabled}>
    <legend>{label}</legend>
    <div className="mode-picker home-modes">
      {options.map((option) => <button key={option.value} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)}>
        <strong>{option.label}</strong><span>{option.description}</span>
      </button>)}
    </div>
  </fieldset>;
}

const DIFFICULTY_DESCRIPTIONS = { easy: "천천히 조준해요.", normal: "적당한 속도로 도전해요.", fast: "빠르게 움직여요.", veryFast: "가장 빠른 속도에 도전해요." };

export function DifficultyCards({ label = "난이도", value, disabled, onChange }: Omit<ChoiceCardsProps<Difficulty>, "options" | "label"> & { label?: string }) {
  return <ChoiceCards<Difficulty> label={label} value={value} disabled={disabled} onChange={onChange}
    options={(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((difficulty) => ({ value: difficulty, label: DIFFICULTY_LABELS[difficulty], description: DIFFICULTY_DESCRIPTIONS[difficulty] }))} />;
}
