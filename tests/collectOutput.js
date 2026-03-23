const collectOutput = async (stream) => {
  let output = '';

  for await (const chunk of stream) {
    output += chunk.toString();
  }

  return output;
};

export default collectOutput;
