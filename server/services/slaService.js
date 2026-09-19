/**
 * SLA Service - Implements strict PS-D04 SLA timelines
 * 
 * Explicit PS-D04 SLA Timelines:
 * - Garbage Dump          → 12 hours
 * - Uncleaned Sweeping    → 24 hours
 * - Construction Debris   → 72 hours
 * 
 * Standard civic defaults:
 * - Blocked Drains        → 24 hours
 * - Potholes              → 48 hours
 * - Non-functional Public Toilets → 24 hours
 */

const SLA_HOURS_MAP = {
  'Garbage Dump': 12,
  'Uncleaned Sweeping': 24,
  'Construction Debris': 72,
  'Blocked Drains': 24,
  'Potholes': 48,
  'Non-functional Public Toilets': 24,
};

const getSlaHoursForCategory = (category) => {
  return SLA_HOURS_MAP[category] || 24;
};

const calculateSlaDeadline = (category, submittedAt = new Date()) => {
  const hours = getSlaHoursForCategory(category);
  const deadline = new Date(new Date(submittedAt).getTime() + hours * 60 * 60 * 1000);
  return {
    slaHours: hours,
    slaDeadline: deadline,
  };
};

const getSlaStatus = (submittedAt, slaDeadline, status, resolvedAt = null) => {
  const now = new Date();
  const subTime = new Date(submittedAt).getTime();
  const deadTime = new Date(slaDeadline).getTime();
  const totalDurationMs = deadTime - subTime;
  
  const isTerminalResolved = status === 'RESOLVED' || status === 'VERIFIED';
  const effectiveEndTime = (isTerminalResolved && resolvedAt) ? new Date(resolvedAt).getTime() : now.getTime();
  
  const remainingMs = deadTime - effectiveEndTime;
  const elapsedMs = effectiveEndTime - subTime;
  const percentElapsed = Math.min(100, Math.max(0, (elapsedMs / totalDurationMs) * 100));
  
  let slaState = 'WITHIN_SLA';
  
  if (effectiveEndTime > deadTime) {
    slaState = 'SLA_BREACHED';
  } else if (!isTerminalResolved && remainingMs <= (totalDurationMs * 0.25)) {
    // Less than 25% of time left
    slaState = 'SLA_AT_RISK';
  } else {
    slaState = 'WITHIN_SLA';
  }

  // Format remaining time nicely
  const totalRemainingSeconds = Math.max(0, Math.floor((deadTime - now.getTime()) / 1000));
  const hoursRemaining = Math.floor(totalRemainingSeconds / 3600);
  const minutesRemaining = Math.floor((totalRemainingSeconds % 3600) / 60);
  const secondsRemaining = totalRemainingSeconds % 60;

  return {
    slaState,
    slaHours: Math.round(totalDurationMs / (3600 * 1000)),
    remainingMs: isTerminalResolved ? 0 : (deadTime - now.getTime()),
    isBreached: effectiveEndTime > deadTime,
    isAtRisk: slaState === 'SLA_AT_RISK',
    percentElapsed: Math.round(percentElapsed),
    remainingFormatted: totalRemainingSeconds > 0 
      ? `${hoursRemaining}h ${minutesRemaining}m ${secondsRemaining}s` 
      : 'Breached',
    deadlineFormatted: new Date(slaDeadline).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    }),
  };
};

module.exports = {
  SLA_HOURS_MAP,
  getSlaHoursForCategory,
  calculateSlaDeadline,
  getSlaStatus,
};
