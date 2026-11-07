import { getApiKey, PROXY_URL, RUNWARE_API_URL } from './config';

export type RunwareTask = { taskType: string; taskUUID: string; [k: string]: unknown };
export type RunwareResult = {
  taskType: string;
  taskUUID: string;
  status?: 'processing' | 'success' | 'error';
  progress?: number;
  imageURL?: string;
  imageUUID?: string;
  videoURL?: string;
  videoUUID?: string;
  audioURL?: string;
  audioUUID?: string;
  mediaURL?: string;
  mediaUUID?: string;
  cost?: number;
  [k: string]: unknown;
};
export type RunwareErrorItem = { code?: string; message?: string; taskUUID?: string; parameter?: string; status?: string };

export class RunwareError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = 'RunwareError';
    this.code = code;
  }
}

export class MissingKeyError extends RunwareError {
  constructor() {
    super('Add your Runware API key in Settings to use AI features.', 'missingApiKey');
  }
}

export function uuid(): string {
  // RFC4122 v4 using crypto.getRandomValues when available
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  const b = new Uint8Array(16);
  if (c?.getRandomValues) c.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Low-level POST of a task array. Returns `data` rows; throws on `errors`. */
export async function post(tasks: RunwareTask[], signal?: AbortSignal): Promise<RunwareResult[]> {
  const key = await getApiKey();
  if (!PROXY_URL && !key) throw new MissingKeyError();
  const res = await fetch(PROXY_URL || RUNWARE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(PROXY_URL ? {} : { Authorization: `Bearer ${key}` }),
    },
    body: JSON.stringify(tasks),
    signal,
  });
  let json: { data?: RunwareResult[]; errors?: RunwareErrorItem[]; error?: RunwareErrorItem } | null = null;
  try {
    json = await res.json();
  } catch {
    throw new RunwareError(`Runware returned HTTP ${res.status}`);
  }
  const errs = json?.errors ?? (json?.error ? [json.error] : []);
  if (errs.length) {
    const e = errs[0];
    throw new RunwareError(friendly(e), e.code);
  }
  if (!res.ok) throw new RunwareError(`Runware returned HTTP ${res.status}`);
  return json?.data ?? [];
}

function friendly(e: RunwareErrorItem) {
  const m = e.message || e.code || 'Runware request failed';
  if (e.code === 'invalidApiKey' || /api key/i.test(m)) return 'Your Runware API key was rejected. Check it in Settings.';
  if (/insufficient|credit|balance/i.test(m)) return 'Your Runware account is out of credits.';
  return e.parameter ? `${m} (${e.parameter})` : m;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type RunOptions = {
  signal?: AbortSignal;
  onProgress?: (p: { status: string; progress?: number }) => void;
  /** Max total wait for async tasks (ms). Default 15 min. */
  timeoutMs?: number;
  /** Delay before first poll (ms). */
  initialDelayMs?: number;
};

/**
 * Run one task and wait for its final result(s).
 * Works for sync tasks (image) and async tasks (video / music) via getResponse polling.
 */
export async function run(task: Omit<RunwareTask, 'taskUUID'> & { taskUUID?: string }, opts: RunOptions = {}): Promise<RunwareResult[]> {
  const t = { includeCost: true, ...task, taskUUID: task.taskUUID ?? uuid() } as unknown as RunwareTask;
  const expected = typeof t.numberResults === 'number' ? (t.numberResults as number) : 1;
  opts.onProgress?.({ status: 'Sending to Runware…' });
  const first = await post([t], opts.signal);
  const done = first.filter((r) => r.taskUUID === t.taskUUID && isFinal(r));
  if (done.length >= expected && !first.some((r) => r.status === 'processing')) return done;

  // Async: poll getResponse with backoff
  const start = Date.now();
  const timeout = opts.timeoutMs ?? 15 * 60_000;
  let delay = opts.initialDelayMs ?? 2500;
  const results = new Map<string, RunwareResult>();
  done.forEach((r) => results.set(key(r), r));
  opts.onProgress?.({ status: 'Generating…', progress: 0 });
  while (Date.now() - start < timeout) {
    if (opts.signal?.aborted) throw new RunwareError('Cancelled', 'cancelled');
    await sleep(delay);
    delay = Math.min(delay * 1.4, 10_000);
    const rows = await post([{ taskType: 'getResponse', taskUUID: t.taskUUID }], opts.signal);
    let pending = false;
    let prog: number | undefined;
    for (const r of rows) {
      if (r.status === 'processing') {
        pending = true;
        if (typeof r.progress === 'number') prog = r.progress / 100;
      } else if (isFinal(r)) results.set(key(r), r);
    }
    opts.onProgress?.({ status: pending ? 'Generating…' : 'Finishing…', progress: prog });
    if (!pending && results.size >= 1) return [...results.values()];
  }
  throw new RunwareError('Timed out waiting for Runware. Check your Runware dashboard for the result.', 'timeout');
}

const isFinal = (r: RunwareResult) => r.status === 'success' || !!(r.imageURL || r.videoURL || r.audioURL || r.mediaURL);
const key = (r: RunwareResult) => r.imageUUID || r.videoUUID || r.audioUUID || r.mediaUUID || r.imageURL || r.videoURL || r.audioURL || String(Math.random());

export const outputUrl = (r: RunwareResult) => r.imageURL || r.videoURL || r.audioURL || r.mediaURL || '';
