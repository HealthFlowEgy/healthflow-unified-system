import { Router } from 'express';
import { organizationController } from '../controllers/organizationController';

const router = Router();

router.get('/', organizationController.listOrganizations.bind(organizationController));
router.get('/:id', organizationController.getOrganization.bind(organizationController));
router.post('/', organizationController.createOrganization.bind(organizationController));
router.put('/:id', organizationController.updateOrganization.bind(organizationController));

export default router;
