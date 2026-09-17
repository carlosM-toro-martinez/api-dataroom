import "dotenv/config";
import app from "./app.js";
import { seedAdmin } from "./config/seedAdmin.js";
import { seedDefaultLaboratories } from "./config/seedDefaultLaboratories.js";

const PORT = process.env.PORT || 4000;

Promise.all([seedAdmin(), seedDefaultLaboratories()]).then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
