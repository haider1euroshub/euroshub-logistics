import { app } from './app.js';
import { env } from './config/env.js';

const PORT = env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`  EliteShip Logistics API running on port ${PORT}`);
  console.log(`  Environment: ${env.NODE_ENV}`);
  console.log(`  Health: http://localhost:${PORT}/health`);
  console.log(`===================================================`);
});
// EliteShip Server
