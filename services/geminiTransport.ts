// Gemini generation is read-only: retry transient failures, never change models or saved data.
export const GEMINI_REQUEST_BUDGET_MS = 65000;
const ATTEMPT_TIMEOUT_MS = 30000;
const MAX_ATTEMPTS = 3;

export interface GeminiRequestOptions {
  timeoutMs?: number;
  maxAttempts?: number;
  onRetry?: (attempt: number) => void;
}

class GeminiRequestError extends Error {
  constructor(message: string, readonly retryable = false, readonly retryAfterMs = 0) {
    super(message);
  }
}

function httpError(response: Response): GeminiRequestError {
  const status = response.status;
  if (status === 429) return new GeminiRequestError('Gemini 額度已用完或請求過於頻繁，請稍後重試，並在 AI Studio 確認配額');
  if (status === 401 || status === 403) return new GeminiRequestError('Gemini API Key 無效或目前專案沒有使用權限，請檢查 AI 設定');
  if (status === 404) return new GeminiRequestError('目前專案無法使用此 Gemini 模型，請在 AI Studio 確認模型可用性');
  const retryable = [408, 500, 502, 503, 504].includes(status);
  const retryAfter = response.headers?.get('retry-after');
  const seconds = retryAfter ? Number(retryAfter) : NaN;
  const retryAfterMs = retryAfter
    ? Math.max(0, Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retryAfter) - Date.now())
    : 0;
  return new GeminiRequestError(
    retryable ? `Google AI 暫時無法回應（${status}），請稍後重試` : `Gemini 請求失敗（${status}），請檢查模型與請求設定`,
    retryable, Number.isFinite(retryAfterMs) ? retryAfterMs : 0
  );
}

export async function requestGeminiJson<T>(
  url: string, apiKey: string, body: unknown | undefined, options: GeminiRequestOptions = {}
): Promise<T> {
  const budget = options.timeoutMs ?? GEMINI_REQUEST_BUDGET_MS;
  if (!Number.isFinite(budget) || budget <= 0) throw new Error('AI 等待時間設定無效');
  const maxAttempts = options.maxAttempts ?? MAX_ATTEMPTS;
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > MAX_ATTEMPTS) throw new Error('AI 重試次數設定無效');
  const deadline = Date.now() + budget;
  const serialized = body === undefined ? undefined : JSON.stringify(body);
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error('AI 等待已達上限，請稍後重試');
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failure: GeminiRequestError;
    try {
      // Race covers response body reading too, even if a fetch implementation ignores abort.
      return await Promise.race([
        (async () => {
          const response = await fetch(url, {
            method: serialized === undefined ? 'GET' : 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
            body: serialized, signal: controller.signal,
          });
          if (!response.ok) throw httpError(response);
          return await response.json() as T;
        })(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            reject(new GeminiRequestError('AI 回應逾時，可能是服務繁忙或連線延遲，請稍後重試', true));
            controller.abort();
          }, Math.min(ATTEMPT_TIMEOUT_MS, remaining));
        }),
      ]);
    } catch (error) {
      if (error instanceof GeminiRequestError) failure = error;
      else if (error instanceof Error && (error.name === 'TypeError' || error.name === 'AbortError')) {
        failure = new GeminiRequestError('AI 連線暫時中斷，請稍後重試', true);
      } else {
        // Never expose raw provider bodies, URLs, prompts, or credentials in errors.
        throw new Error('Google AI 回傳格式無法讀取，請稍後重試');
      }
    } finally {
      clearTimeout(timer);
    }
    const delay = Math.max(failure.retryAfterMs, 750 * 2 ** (attempt - 1) + Math.random() * 250);
    if (!failure.retryable || attempt === maxAttempts || deadline - Date.now() <= delay + 1000) throw failure;
    options.onRetry?.(attempt + 1);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  throw new Error('AI 等待已達上限，請稍後重試');
}
