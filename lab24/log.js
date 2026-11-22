// Печатает строку лога с датой и слоем (SERVICE, MODEL, HTTP)
function log(layer, message) {
  const time = new Date().toLocaleString('sv-SE');
  console.log(`[${time}] [${layer}] ${message}`);
}

module.exports = { log };
