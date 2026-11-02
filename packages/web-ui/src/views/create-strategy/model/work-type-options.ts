import { Layers, Repeat, Target } from 'lucide-react';
import type { StrategyWorkType } from '../../../api/types/strategy-work-type';
import type { WorkTypeOption } from '../../../components/strategy-components/work-type-picker/work-type-picker';

/** The three ways a strategy's work can repeat, with the words the owner sees. */
export const WORK_TYPE_OPTIONS: readonly WorkTypeOption<StrategyWorkType>[] = [
  {
    value: 'one_off',
    label: 'One-off',
    tagline: 'Done once, not repeated.',
    description:
      'One-off means the work does not repeat. It does not mean a single task: your co-worker can take many steps, such as design a post, publish it, and email you the link. Each attempt is marked out of 10, and the next attempt fixes what the mark said was wrong, up to your attempt limit.',
    icon: Target,
  },
  {
    value: 'multi_version',
    label: 'Multi-version',
    tagline: 'Several distinct takes.',
    description:
      'Your co-worker makes several complete versions of one deliverable. Each version takes a deliberately different direction, informed by how the earlier versions were marked.',
    icon: Layers,
  },
  {
    value: 'continuous',
    label: 'Continuous',
    tagline: 'Ongoing, with no finish line.',
    description:
      'Your co-worker works in rounds that never end, such as growing a community. Each round repeats what worked and tries one or two new ideas.',
    icon: Repeat,
  },
];
