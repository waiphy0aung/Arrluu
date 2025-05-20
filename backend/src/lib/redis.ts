import Redis from "ioredis";
import { REDIS_URI } from "../secrets";

const redisConnection = new Redis(REDIS_URI,{maxRetriesPerRequest: null});

export default redisConnection;
