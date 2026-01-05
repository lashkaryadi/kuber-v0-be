import express from 'express';
import cors from 'cors';
import inventoryRoutes from './routes/inventory.js';
import userRoutes from './routes/users.js';
import soldRoutes from './routes/sold.js';
import { errorHandler, notFound } from './middleware/error.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/inventory', inventoryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sold', soldRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
