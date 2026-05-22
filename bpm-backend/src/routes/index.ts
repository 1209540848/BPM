import Router from '@koa/router';
import * as authController from '../controllers/auth.controller';
import * as processController from '../controllers/process.controller';
import * as instanceController from '../controllers/instance.controller';
import * as taskController from '../controllers/task.controller';
import * as testController from '../controllers/test.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/authz.middleware';
import { PERMISSIONS } from '../constants/permissions';

const router = new Router({ prefix: '/api/v1' });

router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/me', authMiddleware, authController.me);

router.get('/process-definitions', authMiddleware, requirePermission(PERMISSIONS.PROCESS_READ), processController.getDefinitions);
router.post('/process-definitions', authMiddleware, requirePermission(PERMISSIONS.PROCESS_WRITE), processController.createDefinition);
router.put('/process-definitions/:id', authMiddleware, requirePermission(PERMISSIONS.PROCESS_WRITE), processController.updateDefinition);
router.post('/process-definitions/:id/publish', authMiddleware, requirePermission(PERMISSIONS.PROCESS_PUBLISH), processController.publishDefinition);
router.delete('/process-definitions/:id', authMiddleware, requirePermission(PERMISSIONS.PROCESS_DELETE), processController.deleteDefinition);

router.get('/process-instances', authMiddleware, requirePermission(PERMISSIONS.INSTANCE_READ), instanceController.getInstances);
router.post('/process-instances', authMiddleware, requirePermission(PERMISSIONS.INSTANCE_START), instanceController.startInstance);
router.get('/process-instances/:id', authMiddleware, requirePermission(PERMISSIONS.INSTANCE_READ), instanceController.getInstance);
router.post('/process-instances/:id/cancel', authMiddleware, requirePermission(PERMISSIONS.INSTANCE_CANCEL), instanceController.cancelInstance);

router.get('/tasks', authMiddleware, requirePermission(PERMISSIONS.TASK_READ), taskController.getTasks);
router.get('/tasks/my-pending', authMiddleware, requirePermission(PERMISSIONS.TASK_READ), taskController.getMyPendingTasks);
router.post('/tasks/:id/complete', authMiddleware, requirePermission(PERMISSIONS.TASK_APPROVE), taskController.completeTask);
router.post('/tasks/:id/reject', authMiddleware, requirePermission(PERMISSIONS.TASK_APPROVE), taskController.rejectTask);
router.post('/tasks/:id/delegate', authMiddleware, requirePermission(PERMISSIONS.TASK_DELEGATE), taskController.delegateTask);

router.post('/test/notification', authMiddleware, requirePermission(PERMISSIONS.DASHBOARD_VIEW), testController.sendTestNotification);

export default router;
