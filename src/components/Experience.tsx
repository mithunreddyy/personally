import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';

import { SKILL_GROUPS } from '../constants';
import { Experience } from '../types';
import { PhoneMeta, Section } from './List';

const EASE = [0.25, 0.46, 0.45, 0.94] as const;

function ExperienceEntry({ exp }: { exp: Experience }) {
  const [open, setOpen] = useState(false);
  const bodyId = `exp-${exp.id}`;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={bodyId}
        className="group w-full text-left py-1 -my-1"
      >
        <span className="flex items-baseline justify-between gap-4">
          <span className="text-ink">{exp.company}</span>
          <span className="flex items-baseline gap-3 text-muted shrink-0">
            <span className="max-[479px]:hidden">{exp.period}</span>
            <span
              aria-hidden="true"
              className={`inline-block transition-transform duration-300 group-hover:text-ink ${open ? 'rotate-45' : ''}`}
            >
              +
            </span>
          </span>
        </span>
        <span className="flex flex-wrap items-baseline justify-between gap-x-4 text-muted">
          <span className="min-w-0">{exp.role}</span>
          <span className="shrink-0 max-[479px]:hidden">{exp.location}</span>
        </span>
        <PhoneMeta parts={[exp.period, exp.location]} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={bodyId}
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden"
          >
            <ul className="pt-3 space-y-2 text-muted">
              {exp.highlights.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ExperienceSection({ experiences, delay = 0 }: { experiences: Experience[]; delay?: number }) {
  return (
    <Section id="experience" title="Experience" delay={delay}>
      <div className="flex flex-col gap-4">
        {experiences.map(exp => (
          <ExperienceEntry key={exp.id} exp={exp} />
        ))}
      </div>
    </Section>
  );
}

// Skill name in content/skills.md -> logo file in public/stack/
const STACK_ICONS: Record<string, string> = {
  TypeScript: 'typescript',
  'JavaScript (ES6+)': 'javascript',
  Python: 'python',
  HTML5: 'html5',
  CSS3: 'css',
  LangChain: 'langchain',
  LangGraph: 'langgraph',
  HuggingFace: 'huggingface',
  PyTorch: 'pytorch',
  TensorFlow: 'tensorflow',
  PySpark: 'apachespark',
  Databricks: 'databricks',
  PostgreSQL: 'postgresql',
  MongoDB: 'mongodb',
  Redis: 'redis',
  Cassandra: 'apachecassandra',
  AWS: 'aws',
  GCP: 'googlecloud',
  Azure: 'azure',
  Docker: 'docker',
  TerraForm: 'terraform',
  'GitHub Actions': 'githubactions',
};

/** One flat row of logos, masked to the muted colour so they follow the theme instead of brand colours */
export function Skills({ delay = 0 }: { delay?: number }) {
  const skills = [...new Set(SKILL_GROUPS.flatMap(group => group.skills))];

  return (
    <Section id="skills" title="Stack" delay={delay}>
      <ul className="flex flex-wrap items-center gap-x-5 gap-y-4">
        {skills.map(skill => {
          const icon = STACK_ICONS[skill];
          return (
            <li key={skill} title={skill}>
              {icon ? (
                <span
                  role="img"
                  aria-label={skill}
                  className="block w-6 h-6 bg-muted hover:bg-ink transition-colors"
                  style={{
                    maskImage: `url(${import.meta.env.BASE_URL}stack/${icon}.svg)`,
                    WebkitMaskImage: `url(${import.meta.env.BASE_URL}stack/${icon}.svg)`,
                    maskSize: 'contain',
                    WebkitMaskSize: 'contain',
                    maskRepeat: 'no-repeat',
                    WebkitMaskRepeat: 'no-repeat',
                    maskPosition: 'center',
                    WebkitMaskPosition: 'center',
                  }}
                />
              ) : (
                // No logo yet: the name stands in rather than the skill going missing
                <span className="text-muted">{skill}</span>
              )}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
