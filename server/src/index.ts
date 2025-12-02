import express from 'express';
import cors from 'cors';
import ephemerisRouter from './routes/ephemeris';
import {
  getMetricsSnapshot,
  metricsContentType
} from './observability/metrics';
import { logInfo } from './observability/logger';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/ephemeris', ephemerisRouter);

app.get('/', (_req, res) => {
  res.send('Solar System Real – API JPL Horizons');
});

app.get('/metrics', async (_req, res) => {
  try {
    const metrics = await getMetricsSnapshot();
    res.setHeader('Content-Type', metricsContentType);
    res.send(metrics);
  } catch (err: any) {
    res.status(500).send(`# Metrics error: ${err?.message ?? String(err)}`);
  }
});

app.listen(port, () => {
  logInfo('api_server_started', { port });
});
