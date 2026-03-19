const redactSecrets = (text: string, secrets: string[]): string => {
  let result = text;

  for (const secret of secrets) {
    if (!secret) {
      continue;
    }

    result = result.split(secret).join('[REDACTED]');

    const escaped = JSON.stringify(secret).slice(1, -1);

    result = result.split(escaped).join('[REDACTED]');
  }

  return result;
};

export default redactSecrets;
