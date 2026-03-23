import telegramFixture from './telegramFixture.js';

const telegramFetch = async (url, options) => {
  const method = String(url).split('/').at(-1);
  const payload = JSON.parse(options.body);

  telegramFixture.requests.push({ method, payload });

  let failure;

  for (let index = 0; index < telegramFixture.failures.length; index += 1) {
    const candidate = telegramFixture.failures[index];

    if (!candidate.method || candidate.method === method) {
      [failure] = telegramFixture.failures.splice(index, 1);

      break;
    }
  }

  if (failure) {
    return Response.json(failure, { status: failure.error_code });
  }

  if (method === 'getWebhookInfo') {
    return Response.json({ ok: true, result: { url: telegramFixture.webhookUrl } });
  }

  if (method === 'getUpdates') {
    return Response.json({ ok: true, result: telegramFixture.updates.splice(0) });
  }

  return Response.json({ ok: true, result: { id: 123456, is_bot: true } });
};

export default telegramFetch;
