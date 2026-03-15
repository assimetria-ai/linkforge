import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import * as Dialog from '@radix-ui/react-dialog'
import { Check, CheckCircle2, ChevronRight, X, Sparkles, User, LayoutDashboard, Bell } from 'lucide-react'
import { cn } from '@/app/lib/@system/utils'

const STORAGE_KEY = 'onboarding_complete'

/**
 * STEPS — customise per product.
 *
 * Each step shape:
 *   { title, description, Icon, action? }
 *
 * action (optional): renders a CTA link inside the step
 *   { label: string, to: string }  — internal react-router link
 *   { label: string, href: string } — external anchor
 */
const STEPS = [
  {
    title: 'Welcome',
    description: 'Thanks for joining. This quick walkthrough will help you get up and running in minutes.',
    Icon: Sparkles,
  },
  {
    title: 'Set up your profile',
    description: 'Add your name and customize your account preferences so the team can recognise you.',
    Icon: User,
    action: { label: 'Open Settings', to: '/settings' },
  },
  {
    title: 'Configure notifications',
    description: 'Choose which events you want to be alerted about so you never miss what matters.',
    Icon: Bell,
    action: { label: 'Notification preferences', to: '/settings?tab=notifications' },
  },
  {
    title: 'Explore the dashboard',
    description: 'Your dashboard is your home base. Check back here for activity, stats, and quick actions.',
    Icon: LayoutDashboard,
  },
]

/** Read a localStorage value, returning null if storage is unavailable. */
function lsGet(key) {
  try { return localStorage.getItem(key) } catch { return null }
}

/** Write to localStorage, silently ignoring quota or access errors. */
function lsSet(key, value) {
  try { localStorage.setItem(key, value) } catch { /* storage unavailable */ }
}

/** Remove a localStorage key, silently ignoring errors. */
function lsRemove(key) {
  try { localStorage.removeItem(key) } catch { /* storage unavailable */ }
}

export function useOnboarding() {
  const [open, setOpen] = useState(() => !lsGet(STORAGE_KEY))
  const [isComplete, setIsComplete] = useState(() => !!lsGet(STORAGE_KEY))

  function complete() {
    lsSet(STORAGE_KEY, 'true')
    lsRemove('onboarding_step')
    setOpen(false)
    setIsComplete(true)
  }

  function reset() {
    lsRemove(STORAGE_KEY)
    lsRemove('onboarding_step')
    setOpen(true)
    setIsComplete(false)
  }

  return { open, setOpen, complete, reset, isComplete }
}

// ---- Completion screen -------------------------------------------------------

function CompletionScreen({ onClose }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 mb-5">
        <CheckCircle2 className="h-7 w-7 text-emerald-500" aria-hidden="true" />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">You're all set!</h2>
      <p className="text-sm text-muted-foreground leading-relaxed mb-8 max-w-xs">
        Your workspace is ready. Explore the dashboard or dive straight into your first project.
      </p>
      <button
        onClick={onClose}
        className="flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Get started
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

// ---- Step list (desktop sidebar) --------------------------------------------

/**
 * StepList — shows all steps with their completion status in a sidebar column.
 * Displayed on md+ screens alongside the step content panel.
 */
function StepList({ steps, currentStep, completedCount }) {
  return (
    <div className="space-y-0.5 py-2">
      {steps.map((s, i) => {
        const isActive = i === currentStep
        const isDone   = i < completedCount
        return (
          <div
            key={i}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
              isActive ? 'bg-accent' : 'opacity-50'
            )}
          >
            <div
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-semibold transition-colors',
                isDone
                  ? 'border-primary bg-primary text-primary-foreground'
                  : isActive
                  ? 'border-primary text-primary'
                  : 'border-border text-muted-foreground'
              )}
            >
              {isDone ? <Check className="h-3 w-3" /> : i + 1}
            </div>
            <span
              className={cn(
                'text-sm font-medium truncate',
                isActive ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {s.title}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ---- Wizard -----------------------------------------------------------------

export default function OnboardingWizard({ open, onComplete, onDismiss }) {
  const [step, setStep] = useState(0)
  const [completed, setCompleted] = useState(false)

  const isLast      = step === STEPS.length - 1
  const currentStep = STEPS[step]
  const { Icon, action } = currentStep

  // Resume from the saved step each time dialog opens (falls back to 0).
  // Step is persisted so users can close and continue where they left off.
  useEffect(() => {
    if (open) {
      const saved = parseInt(lsGet('onboarding_step'), 10)
      setStep(Number.isFinite(saved) && saved >= 0 && saved < STEPS.length ? saved : 0)
      setCompleted(false)
    }
  }, [open])

  function handleNext() {
    if (isLast) {
      setCompleted(true)
    } else {
      setStep(s => s + 1)
    }
  }

  function handleBack() {
    setStep(s => s - 1)
  }

  function handleClose() {
    if (completed) {
      onComplete?.()
    } else {
      onDismiss?.()
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={v => !v && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 animate-in fade-in-0 duration-200" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card shadow-xl animate-in fade-in-0 zoom-in-95 duration-200 focus:outline-none overflow-hidden"
          aria-describedby={undefined}
        >
          <Dialog.Title className="sr-only">Onboarding</Dialog.Title>

          {/* Close button — always visible */}
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 z-10 rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          {completed ? (
            <CompletionScreen onClose={handleClose} />
          ) : (
            /*
             * Two-panel layout:
             *   Left  (md+): step list sidebar
             *   Right       : step content + navigation
             */
            <div className="flex flex-col md:flex-row">
              {/* Step list — desktop only */}
              <div className="hidden md:block w-48 shrink-0 border-r border-border bg-muted/30 p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-3">
                  Setup
                </p>
                <StepList steps={STEPS} currentStep={step} completedCount={step} />
              </div>

              {/* Content panel */}
              <div className="flex-1 min-w-0 p-6">
                {/* Step dots — mobile only */}
                <div className="flex items-center gap-1.5 mb-6 md:hidden">
                  {STEPS.map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        'rounded-full transition-all duration-300',
                        i === step ? 'w-4 h-2 bg-primary' :
                        i < step   ? 'w-2 h-2 bg-primary/50' :
                                     'w-2 h-2 bg-muted'
                      )}
                    />
                  ))}
                </div>

                {/* Step icon */}
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>

                {/* Step content */}
                <div className="mb-6 min-h-[80px]">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Step {step + 1} of {STEPS.length}
                  </p>
                  <h2 className="text-xl font-semibold text-foreground mb-2">
                    {currentStep.title}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {currentStep.description}
                  </p>
                </div>

                {/* Step-level CTA (optional per step) */}
                {action && (
                  <div className="mb-6">
                    {action.to ? (
                      <Link
                        to={action.to}
                        onClick={handleClose}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                      >
                        {action.label}
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      <a
                        href={action.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                      >
                        {action.label}
                        <ChevronRight className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {step > 0 && (
                      <button
                        onClick={handleBack}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Back
                      </button>
                    )}
                    {step === 0 && (
                      <button
                        onClick={handleClose}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Skip for now
                      </button>
                    )}
                  </div>

                  <button
                    onClick={handleNext}
                    className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    {isLast ? (
                      <>
                        <Check className="h-4 w-4" />
                        Done
                      </>
                    ) : (
                      <>
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
