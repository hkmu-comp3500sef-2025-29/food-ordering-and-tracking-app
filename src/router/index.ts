import { Router } from "express";

import { routerApi } from "#/router/api";
import { routerView } from "#/router/view";

const router: Router = Router();

router.use("/", routerView);

router.use("/api", routerApi);

export { router };
