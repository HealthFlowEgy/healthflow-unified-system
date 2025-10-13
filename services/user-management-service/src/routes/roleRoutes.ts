import { Router } from 'express';
import { roleController } from '../controllers/roleController';

const router = Router();

router.get('/', roleController.listRoles.bind(roleController));
router.get('/:id', roleController.getRole.bind(roleController));
router.post('/', roleController.createRole.bind(roleController));
router.put('/:id', roleController.updateRole.bind(roleController));

export default router;
