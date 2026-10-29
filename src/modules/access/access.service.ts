import { basePrisma, prisma } from "../../config/prisma.js";

// Estado de cada cuenta, ya traducido a lo que el administrador necesita ver.
export type AccountState = "ACTIVE" | "INACTIVE" | "VISITOR_ACTIVE" | "VISITOR_EXPIRED" | "VISITOR_PENDING";
export type InvitationState = "PENDING_REVIEW" | "NOT_ENTERED" | "ENTERED" | "EXPIRED" | "CANCELLED" | "REJECTED";

const DAY_MS = 24 * 60 * 60 * 1000;

export const accessService = {
  async overview() {
    const now = new Date();
    const [users, roles, requests, logins, since] = await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true, nombre: true, email: true, role: true, activo: true, createdAt: true,
          visitorAccessExpiresAt: true, visitorLastLoginAt: true, visitorDeviceIdHash: true,
        },
      }),
      prisma.role.findMany({ select: { key: true, name: true } }),
      prisma.dataRoomAccessRequest.findMany({
        orderBy: { requestedAt: "desc" },
        include: { reviewedBy: { select: { nombre: true } } },
      }),
      // Último ingreso y cantidad de ingresos por persona, tomados de la bitácora de auditoría.
      basePrisma.$queryRaw<Array<{ user_id: string; last_at: Date; total: bigint; last_30: bigint }>>`
        SELECT record_id AS user_id, max(at) AS last_at, count(*) AS total,
               count(*) FILTER (WHERE at >= now() - interval '30 days') AS last_30
        FROM audit_log WHERE action = 'LOGIN' AND record_id IS NOT NULL GROUP BY record_id`,
      basePrisma.$queryRaw<Array<{ at: Date | null }>>`SELECT min(at) AS at FROM audit_log`,
    ]);

    const roleName = new Map(roles.map((role) => [role.key, role.name]));
    const loginByUser = new Map(logins.map((row) => [Number(row.user_id), row]));
    const userByEmail = new Map(users.map((user) => [user.email.toLowerCase(), user]));

    const accounts = users.map((user) => {
      const login = loginByUser.get(user.id);
      const isVisitor = user.role === "VISITANTE";
      const expired = isVisitor && (!user.visitorAccessExpiresAt || user.visitorAccessExpiresAt <= now);
      let state: AccountState;
      if (!user.activo) state = "INACTIVE";
      else if (!isVisitor) state = "ACTIVE";
      else if (expired) state = "VISITOR_EXPIRED";
      else if (!user.visitorLastLoginAt && !login) state = "VISITOR_PENDING";
      else state = "VISITOR_ACTIVE";
      const lastLoginAt = login?.last_at ?? user.visitorLastLoginAt ?? null;
      const daysLeft =
        isVisitor && user.visitorAccessExpiresAt && !expired
          ? Math.ceil((user.visitorAccessExpiresAt.getTime() - now.getTime()) / DAY_MS)
          : null;
      return {
        id: user.id,
        name: user.nombre,
        email: user.email,
        role: user.role,
        roleName: roleName.get(user.role) ?? user.role,
        isVisitor,
        state,
        createdAt: user.createdAt,
        lastLoginAt,
        loginsTotal: Number(login?.total ?? 0),
        logins30Days: Number(login?.last_30 ?? 0),
        accessExpiresAt: isVisitor ? user.visitorAccessExpiresAt : null,
        daysLeft,
        deviceLinked: isVisitor ? Boolean(user.visitorDeviceIdHash) : null,
      };
    });

    const invitations = requests.map((request) => {
      const user = request.visitorUserId ? users.find((candidate) => candidate.id === request.visitorUserId) : userByEmail.get(request.email.toLowerCase());
      const lastLogin = user ? (loginByUser.get(user.id)?.last_at ?? user.visitorLastLoginAt ?? null) : null;
      let state: InvitationState;
      if (request.status === "PENDING") state = "PENDING_REVIEW";
      else if (request.status === "REJECTED") state = "REJECTED";
      else if (request.status === "CANCELLED") state = "CANCELLED";
      else if (request.expiresAt && request.expiresAt <= now) state = "EXPIRED";
      else state = lastLogin ? "ENTERED" : "NOT_ENTERED";
      return {
        id: request.id,
        name: request.fullName,
        email: request.email,
        company: request.company,
        requestedAt: request.requestedAt,
        reviewedAt: request.reviewedAt,
        reviewedBy: request.reviewedBy?.nombre ?? null,
        expiresAt: request.expiresAt,
        state,
        lastLoginAt: lastLogin,
      };
    });

    const count = (predicate: (account: (typeof accounts)[number]) => boolean) => accounts.filter(predicate).length;
    const invitationCount = (state: InvitationState) => invitations.filter((invitation) => invitation.state === state).length;
    const staff = accounts.filter((account) => !account.isVisitor);
    const byRole = Object.entries(
      accounts.reduce<Record<string, { roleName: string; total: number; active: number }>>((acc, account) => {
        const row = (acc[account.role] ??= { roleName: account.roleName, total: 0, active: 0 });
        row.total += 1;
        if (account.state === "ACTIVE" || account.state === "VISITOR_ACTIVE" || account.state === "VISITOR_PENDING") row.active += 1;
        return acc;
      }, {}),
    )
      .map(([role, row]) => ({ role, ...row }))
      .sort((a, b) => b.total - a.total);

    return {
      generatedAt: now,
      // Los ingresos solo se conocen desde que existe la bitácora; antes de esa fecha no hay registro de quién entró.
      loginTrackingSince: since[0]?.at ?? null,
      // El sistema no guarda si el correo de invitación salió bien; solo se puede saber si el servidor tiene correo configurado.
      emailConfigured: Boolean(process.env["SMTP_USER"] && process.env["SMTP_PASS"]),
      totals: {
        accounts: accounts.length,
        staffActive: staff.filter((account) => account.state === "ACTIVE").length,
        staffInactive: staff.filter((account) => account.state === "INACTIVE").length,
        visitorsActive: count((account) => account.state === "VISITOR_ACTIVE" || account.state === "VISITOR_PENDING"),
        visitorsExpired: count((account) => account.state === "VISITOR_EXPIRED"),
        visitorsInactive: count((account) => account.isVisitor && account.state === "INACTIVE"),
        enteredLast7Days: count((account) => Boolean(account.lastLoginAt && now.getTime() - new Date(account.lastLoginAt).getTime() <= 7 * DAY_MS)),
        neverEntered: count((account) => !account.lastLoginAt),
        expiringSoon: count((account) => account.daysLeft !== null && account.daysLeft <= 7),
      },
      invitationTotals: {
        pendingReview: invitationCount("PENDING_REVIEW"),
        notEntered: invitationCount("NOT_ENTERED"),
        entered: invitationCount("ENTERED"),
        expired: invitationCount("EXPIRED"),
        cancelled: invitationCount("CANCELLED"),
        rejected: invitationCount("REJECTED"),
      },
      byRole,
      accounts,
      invitations,
    };
  },
};
