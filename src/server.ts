import "dotenv/config";
import app from "./app.js";
import { seedAdmin } from "./config/seedAdmin.js";

const PORT = process.env.PORT || 4000;

seedAdmin().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
