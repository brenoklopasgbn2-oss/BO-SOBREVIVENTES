import { env } from '../config/env.js';
import { brl, coins, dateTime, shortId } from '../utils/format.js';

export function templateLocals(req, res, next) {
  res.locals.appName = env.appName;
  res.locals.currencyName = env.currencyName;
  res.locals.path = req.path;
  res.locals.brl = brl;
  res.locals.coins = coins;
  res.locals.dateTime = dateTime;
  res.locals.shortId = shortId;
  res.locals.success = req.query.success || null;
  res.locals.error = req.query.error || null;
  next();
}
