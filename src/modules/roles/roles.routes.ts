import { Router, type NextFunction, type Request, type Response } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { PERMISSION_ACTIONS, PERMISSION_MODULES } from "./permissions.catalog.js";
import { createRoleSchema, updateRoleSchema } from "./roles.schema.js";
import { rolesService } from "./roles.service.js";

const handle =
  (fn: (req: Request) => Promise<unknown>, status = 200) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(status).json({ success: true, data: await fn(req) });
    } catch (error) {
      next(error);
    }
  };

const router = Router();
router.use(authenticate);
router.use(requirePermission("usuarios"));

router.get("/catalog", handle(async () => ({ modules: PERMISSION_MODULES, actions: PERMISSION_ACTIONS })));
router.get("/", handle(() => rolesService.list()));
router.post("/", validate(createRoleSchema), handle((req) => rolesService.create(req.body), 201));
router.patch("/:key", validate(updateRoleSchema), handle((req) => rolesService.update(String(req.params["key"]), req.body)));
router.delete("/:key", handle((req) => rolesService.remove(String(req.params["key"]))));

export default router;
