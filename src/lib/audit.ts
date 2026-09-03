// =============================================================
// Audit Logging
// Logs all sensitive actions for security monitoring.
// In production, send to external logging service.
// =============================================================

export type AuditAction =
  | 'payment_attempt'
  | 'payment_success'
  | 'payment_duplicate'
  | 'subscription_created'
  | 'call_started'
  | 'call_ended'
  | 'call_time_exceeded'
  | 'report_submitted'
  | 'rate_limit_hit'
  | 'suspicious_activity'
  | 'env_validation_failed'
  | 'unauthorized_access';

interface AuditEntry {
  timestamp: string;
  action: AuditAction;
  userId?: string;
  wallet?: string;
  ip?: string;
  details?: Record<string, any>;
  severity: 'info' | 'warning' | 'critical';
}

// In-memory audit log (last 1000 entries)
const auditLog: AuditEntry[] = [];
const MAX_LOG_SIZE = 1000;

/**
 * Record an audit event.
 */
export function auditLog(
  action: AuditAction,
  severity: 'info' | 'warning' | 'critical' = 'info',
  details?: Record<string, any>
) {
  const entry: AuditEntry = {
    timestamp: new Date().toISOString(),
    action,
    severity,
    ...details,
  };

  // Add to in-memory log
  auditLog.push(entry);
  if (auditLog.length > MAX_LOG_SIZE) {
    auditLog.shift();
  }

  // Console output for monitoring
  const prefix = severity === 'critical' ? '🔴' : severity === 'warning' ? '🟡' : '🟢';
  console.log(`${prefix} [AUDIT] ${action}`, details ? JSON.stringify(details) : '');

  // In production: send to external logging service
  // Example: await sendToLogService(entry);
}

/**
 * Get recent audit entries (for admin dashboard).
 */
export function getRecentLogs(limit: number = 100): AuditEntry[] {
  return auditLog.slice(-limit);
}

/**
 * Get logs for a specific user.
 */
export function getUserLogs(userId: string, limit: number = 50): AuditEntry[] {
  return auditLog
    .filter((e) => e.userId === userId || e.wallet === e.wallet)
    .slice(-limit);
}

// Convenience methods
export const audit = {
  paymentAttempt: (wallet: string, tier: number, ip?: string) =>
    auditLog('payment_attempt', 'info', { wallet, tier, ip }),

  paymentSuccess: (userId: string, wallet: string, tier: number, txHash: string) =>
    auditLog('payment_success', 'info', { userId, wallet, tier, txHash }),

  paymentDuplicate: (wallet: string, txHash: string) =>
    auditLog('payment_duplicate', 'warning', { wallet, txHash }),

  subscriptionCreated: (userId: string, tier: number) =>
    auditLog('subscription_created', 'info', { userId, tier }),

  callStarted: (userId: string, hasSub: boolean) =>
    auditLog('call_started', 'info', { userId, hasSub }),

  callEnded: (userId: string, duration: number) =>
    auditLog('call_ended', 'info', { userId, duration }),

  callTimeExceeded: (userId: string) =>
    auditLog('call_time_exceeded', 'warning', { userId }),

  reportSubmitted: (reporterId: string, reportedId: string, reason: string) =>
    auditLog('report_submitted', 'info', { reporterId, reportedId, reason }),

  rateLimitHit: (ip: string, route: string) =>
    auditLog('rate_limit_hit', 'warning', { ip, route }),

  suspiciousActivity: (ip: string, reason: string) =>
    auditLog('suspicious_activity', 'critical', { ip, reason }),

  unauthorizedAccess: (ip: string, route: string) =>
    auditLog('unauthorized_access', 'critical', { ip, route }),
};
