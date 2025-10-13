import { Router } from 'express';
import { userController } from '../controllers/userController';

const router = Router();

router.get('/', userController.listUsers.bind(userController));
router.get('/:id', userController.getUser.bind(userController));
router.post('/', userController.createUser.bind(userController));
router.put('/:id', userController.updateUser.bind(userController));
router.delete('/:id', userController.deleteUser.bind(userController));
router.post('/:id/roles', userController.assignRole.bind(userController));

export default router;
