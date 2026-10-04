import type { Analysis } from './types';

const ENDPOINT = import.meta.env.VITE_API_URL ?? 'https://n8n.draminski.dev/webhook/manabi';

export class ApiError extends Error {}

export const analyzeOffer = async (input: { url?: string; text?: string; summary: string }): Promise<Analysis> => {
  let response: Response;
  try {
    response = await fetch(`${ENDPOINT}/offers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: input.url, text: input.text, profile: { summary: input.summary } }),
    });
  } catch {
    throw new ApiError('network');
  }
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.offer) throw new ApiError(response.status === 422 ? 'unsupported' : 'failed');
  return body as Analysis;
};

export const reportUrl = (questionId: string): string => {
  const params = new URLSearchParams({
    title: `Błąd w pytaniu ${questionId}`,
    body: `Pytanie: \`${questionId}\`\n\nCo jest nie tak:\n`,
    labels: 'question',
  });
  return `https://github.com/ldraminski/manabi/issues/new?${params}`;
};
