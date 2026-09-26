import { Router } from 'express';
import { clientController } from '../controllers/client.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/rbac.middleware.js';
import { validateRequest } from '../middlewares/validate.js';
import { createClientSchema } from '../validators/client.validator.js';

const router = Router();

// All client endpoints require Admin role as per PDF specification
router.use(authenticate, requireAdmin);

router.post('/', validateRequest(createClientSchema), clientController.createClient.bind(clientController));
router.get('/', clientController.getClients.bind(clientController));
router.get('/:id', clientController.getClientById.bind(clientController));

export default router;
