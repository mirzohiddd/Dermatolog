import { config } from '../config/env.js';
import { JsonDatabase } from './jsonDatabase.js';

/** Butun ilova uchun yagona JSON baza nusxasi. */
export const db = new JsonDatabase(config.dataDir);
