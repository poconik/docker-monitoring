const escapeHtml = (text: string): string => {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
};

export default escapeHtml;
