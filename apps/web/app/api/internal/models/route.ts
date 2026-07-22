import { NextResponse } from 'next/server';
import { prisma } from '@apexpredix/db';
import { requireServiceAuth, type ServiceScope } from '@/lib/internal-auth';
import {
  promoteToProduction,
  rollbackProduction,
  registerModel,
  transitionStage,
  getProductionModel,
  type ModelStage,
} from '@/lib/models/registry';

export const runtime = 'nodejs';

/**
 * Synchronous model-lifecycle control surface.
 *
 * Registration, stage transitions, promotion and rollback are single, fast DB
 * transactions — far inside the 300s serverless limit — so they execute here
 * directly rather than through the long-running worker queue. The async job
 * kinds (MODEL_PROMOTE/MODEL_ROLLBACK via /api/internal/jobs) remain for n8n-
 * orchestrated flows; this endpoint is the direct admin/service path.
 *
 *   POST /api/internal/models { "action": "promote",  "versionId": "..." }
 *   POST /api/internal/models { "action": "rollback",  "family": "ensemble" }
 *   POST /api/internal/models { "action": "register",  "name": "...", "family": "ensemble" }
 *   POST /api/internal/models { "action": "transition","versionId": "...", "toStage": "SHADOW" }
 *
 * Scope is per action: an ingestion or shadow key must never be able to change
 * which model serves subscribers. Every op is audited (both here and via the
 * immutable ModelStageTransition the registry writes).
 */

type Action = 'register' | 'transition' | 'promote' | 'rollback';

const ACTION_SCOPE: Record<Action, ServiceScope> = {
  register: 'models:promote',
  transition: 'models:promote',
  promote: 'models:promote',
  rollback: 'models:rollback',
};

const NON_PRODUCTION_STAGES: ReadonlyArray<Exclude<ModelStage, 'PRODUCTION'>> = [
  'DRAFT',
  'TRAINING',
  'SHADOW',
  'APPROVED',
  'RETIRED',
  'FAILED',
];

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return bad('body must be a JSON object');
    body = parsed as Record<string, unknown>;
  } catch {
    return bad('body is not valid JSON');
  }

  const action = body.action as Action;
  if (!action || !(action in ACTION_SCOPE)) {
    return bad(`action must be one of: ${Object.keys(ACTION_SCOPE).join(', ')}`);
  }

  // Authorise for the specific action — promotion authority is not rollback
  // authority, and neither is registration.
  const auth = requireServiceAuth(request, ACTION_SCOPE[action]);
  if (!auth.ok) return auth.response;

  const actor = `service:${auth.caller.id}`;
  const reason = typeof body.reason === 'string' ? body.reason : undefined;

  try {
    switch (action) {
      case 'register': {
        if (typeof body.name !== 'string' || typeof body.family !== 'string') {
          return bad('register requires string `name` and `family`');
        }
        const version = await registerModel(prisma, {
          name: body.name,
          family: body.family,
          ...(typeof body.sport === 'string' ? { sport: body.sport } : {}),
          ...(typeof body.featureSetName === 'string' ? { featureSetName: body.featureSetName } : {}),
          ...(typeof body.featureSetVersion === 'number' ? { featureSetVersion: body.featureSetVersion } : {}),
          ...(typeof body.gitSha === 'string' ? { gitSha: body.gitSha } : {}),
          actor,
        });
        await audit(actor, 'model.registered', version.id, { name: version.name });
        return NextResponse.json({ ok: true, model: version }, { status: 201 });
      }

      case 'transition': {
        if (typeof body.versionId !== 'string') return bad('transition requires `versionId`');
        const toStage = body.toStage as Exclude<ModelStage, 'PRODUCTION'>;
        if (!NON_PRODUCTION_STAGES.includes(toStage)) {
          return bad(`toStage must be one of: ${NON_PRODUCTION_STAGES.join(', ')} (use action "promote" for PRODUCTION)`);
        }
        const updated = await transitionStage(prisma, body.versionId, toStage, actor, reason);
        await audit(actor, `model.transition.${toStage}`, updated.id, { reason });
        return NextResponse.json({ ok: true, model: updated });
      }

      case 'promote': {
        if (typeof body.versionId !== 'string') return bad('promote requires `versionId`');
        const result = await promoteToProduction(prisma, body.versionId, actor, reason ? { reason } : {});
        await audit(actor, 'model.promoted', result.promoted.id, {
          retired: result.retired?.id ?? null,
          reason,
        });
        return NextResponse.json({ ok: true, promoted: result.promoted, retired: result.retired });
      }

      case 'rollback': {
        if (typeof body.family !== 'string') return bad('rollback requires `family`');
        const sport = typeof body.sport === 'string' ? body.sport : 'FOOTBALL';
        const result = await rollbackProduction(prisma, body.family, sport, actor);
        await audit(actor, 'model.rolledback', result.promoted.id, { retired: result.retired?.id ?? null });
        return NextResponse.json({ ok: true, restored: result.promoted, retired: result.retired });
      }

      default:
        return bad('unsupported action');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'model operation failed';
    // Illegal transitions / missing versions are caller errors (409), not 500s.
    return NextResponse.json({ ok: false, error: message }, { status: 409 });
  }
}

/** Read the current production model for a family (GET ?family=ensemble&sport=FOOTBALL). */
export async function GET(request: Request) {
  const auth = requireServiceAuth(request, 'reports:read');
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const family = url.searchParams.get('family');
  if (!family) return bad('family query parameter is required');
  const sport = url.searchParams.get('sport') ?? 'FOOTBALL';
  const model = await getProductionModel(prisma, family, sport);
  return NextResponse.json({ ok: true, model });
}

async function audit(actor: string, action: string, target: string, meta: Record<string, unknown>) {
  await prisma.auditLog.create({ data: { actor, action, target, meta: meta as never } });
}
