import { db, SecurityAuditLog, SecurityEventType } from '@/lib/db';
import { SyncEngine } from '@/lib/sync/SyncEngine';
import { useTenantStore } from '@/store/useTenantStore';
import { logger, logCategories } from '@/lib/logger';

interface AuditEvent {
  eventType: SecurityEventType;
  userId?: string;
  userEmail?: string;
  tenantId?: string;
  tenantUuid?: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  success: boolean;
}

function getCurrentTenant() {
  return useTenantStore.getState().currentTenant;
}

export const securityAudit = {
  async log(event: AuditEvent): Promise<void> {
    try {
      const localId = crypto.randomUUID();
      const currentTenant = getCurrentTenant();
      const auditEntry: SecurityAuditLog = {
        localId,
        tenantId: event.tenantId || currentTenant?.slug,
        tenantUuid: event.tenantUuid || currentTenant?.id,
        eventType: event.eventType,
        userId: event.userId,
        userEmail: event.userEmail,
        resourceType: event.resourceType,
        resourceId: event.resourceId,
        details: event.details,
        success: event.success,
        createdAt: new Date(),
      };

      await db.securityAuditLog.add(auditEntry);

      await SyncEngine.addToQueue(
        'security_audit_log',
        'create',
        auditEntry as unknown as Record<string, unknown>,
        localId
      );

      logger.info('Security event logged', {
        eventType: event.eventType,
        userId: event.userId,
        success: event.success,
        category: logCategories.AUTH,
      });
    } catch (error) {
      logger.error('Failed to log security event', error as Error, {
        eventType: event.eventType,
        category: logCategories.AUTH,
      });
    }
  },

  async getRecentEvents(limit = 50): Promise<SecurityAuditLog[]> {
    try {
      const currentTenant = getCurrentTenant();
      if (!currentTenant) return [];

      const events = await db.securityAuditLog
        .where('tenantId')
        .equals(currentTenant.slug)
        .reverse()
        .limit(limit)
        .toArray();

      return events;
    } catch (error) {
      logger.error('Failed to get recent security events', error as Error, {
        category: logCategories.AUTH,
      });
      return [];
    }
  },

  async getEventsByUser(userId: string, limit = 50): Promise<SecurityAuditLog[]> {
    try {
      const events = await db.securityAuditLog
        .where('userId')
        .equals(userId)
        .reverse()
        .limit(limit)
        .toArray();

      return events;
    } catch (error) {
      logger.error('Failed to get user security events', error as Error, {
        userId,
        category: logCategories.AUTH,
      });
      return [];
    }
  },

  async getEventsByType(eventType: SecurityEventType, limit = 50): Promise<SecurityAuditLog[]> {
    try {
      const currentTenant = getCurrentTenant();
      if (!currentTenant) return [];

      const events = await db.securityAuditLog
        .where('[tenantId+eventType]')
        .equals([currentTenant.slug, eventType])
        .reverse()
        .limit(limit)
        .toArray();

      return events;
    } catch {
      const currentTenant = getCurrentTenant();
      const allEvents = await db.securityAuditLog
        .where('tenantId')
        .equals(currentTenant?.slug || '')
        .reverse()
        .filter(e => e.eventType === eventType)
        .limit(limit)
        .toArray();

      return allEvents;
    }
  },

  async logLoginSuccess(userId: string, email: string): Promise<void> {
    await this.log({
      eventType: 'LOGIN_SUCCESS',
      userId,
      userEmail: email,
      success: true,
    });
  },

  async logLoginFailed(email: string, reason?: string): Promise<void> {
    await this.log({
      eventType: 'LOGIN_FAILED',
      userEmail: email,
      success: false,
      details: reason ? { reason } : undefined,
    });
  },

  async logRateLimited(email: string): Promise<void> {
    await this.log({
      eventType: 'RATE_LIMITED',
      userEmail: email,
      success: false,
      details: { reason: 'Too many login attempts' },
    });
  },

  async logPasswordChange(userId: string, email: string): Promise<void> {
    await this.log({
      eventType: 'PASSWORD_CHANGE',
      userId,
      userEmail: email,
      success: true,
    });
  },

  async logEmployeeCreated(userId: string, email: string, tenantId: string): Promise<void> {
    await this.log({
      eventType: 'EMPLOYEE_CREATED',
      userId,
      userEmail: email,
      tenantId,
      success: true,
    });
  },

  async logTenantCreated(tenantId: string, tenantUuid: string): Promise<void> {
    await this.log({
      eventType: 'TENANT_CREATED',
      tenantId,
      tenantUuid,
      success: true,
    });
  },

  async logImpersonationStarted(
    adminUserId: string,
    targetTenantId: string,
    targetTenantUuid: string
  ): Promise<void> {
    await this.log({
      eventType: 'IMPERSONATION_STARTED',
      userId: adminUserId,
      tenantId: targetTenantId,
      tenantUuid: targetTenantUuid,
      success: true,
    });
  },

  async logImpersonationEnded(adminUserId: string): Promise<void> {
    await this.log({
      eventType: 'IMPERSONATION_ENDED',
      userId: adminUserId,
      success: true,
    });
  },
};
