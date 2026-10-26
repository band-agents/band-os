import { handle } from '../server/routes.js';

export default function handler(req, res) { return handle(req, res); }
export const config = { maxDuration: 15 };
