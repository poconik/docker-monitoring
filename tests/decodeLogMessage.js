const decodeLogMessage = (message) => {
  const content = message.slice(message.indexOf('<pre>') + 5, message.lastIndexOf('</pre>'));

  return content.replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
};

export default decodeLogMessage;
