import "dotenv/config";
import app from "./app.js";
import { seedAdmin } from "./config/seedAdmin.js";
import { seedDefaultLaboratories } from "./config/seedDefaultLaboratories.js";
import { scheduleAuditAnchor, startAudit } from "./config/audit.js";

const PORT = process.env.PORT || 4000;

startAudit().then(() => Promise.all([seedAdmin(), seedDefaultLaboratories()])).then(() => {
  scheduleAuditAnchor();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
