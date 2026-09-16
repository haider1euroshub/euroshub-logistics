import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { sendSuccess } from '../middleware/envelope.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/notifications
 * Lists current user's notifications, paginated
 */
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const pageSize = 20;
    const skip = (page - 1) * pageSize;

    const [total, unreadCount, notifications] = await Promise.all([
      prisma.notification.count({ where: { userId: user.id } }),
      prisma.notification.count({ where: { userId: user.id, isRead: false } }),
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    return sendSuccess(res, {
      notifications,
      unreadCount,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/notifications/:id/read
 * Mark single notification as read
 */
router.post('/:id/read', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const id = req.params.id;

    await prisma.notification.updateMany({
      where: { id, userId: user.id },
      data: { isRead: true },
    });

    return sendSuccess(res, { message: 'Notification marked as read.' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/notifications/read-all
 * Mark all notifications as read for current user
 */
router.post('/read-all', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;

    await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    });

    return sendSuccess(res, { message: 'All notifications marked as read.' });
  } catch (error) {
    next(error);
  }
});

export default router;
