var serverSide = require('matrix/server');
var ioServer = serverSide.ioServer;

'use strict';

function calculateNormalizedDistance(a, b, h, w) {
  if (w / h < 1)
    return Math.sqrt(Math.pow((a[0] - b[0]) * w / h, 2) + Math.pow(a[1] - b[1], 2));
  else
    return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow((a[1] - b[1]) * h / w, 2));
}

function calculateVelocity(a, b, h, w) {
  return calculateNormalizedDistance(a.position, b.position, h, w) / Math.abs(a.timeStamp - b.timeStamp);
}

function scaleDistance(d, m) {
  return Math.min(d / m, 1);
}

class ServerPerform extends serverSide.PerformanceManager {
  constructor(clientManager, topologyManager, soloistManager) {
    super(clientManager, topologyManager);

    this.__soloistManager = soloistManager;

    this.fingerRadius = 0.3;
  }

  addPlayer(player) {
    this.inputListener(player.socket);
    this.__soloistManager.addPlayer(player);
  }

  inputListener(socket) {
    socket.on('touchend', (fingerPosition, timeStamp) => this.touchHandler('touchend', fingerPosition, timeStamp, socket));
    socket.on('touchmove', (fingerPosition, timeStamp) => this.touchHandler('touchmove', fingerPosition, timeStamp, socket));
    socket.on('touchstart', (fingerPosition, timeStamp) => this.touchHandler('touchstart', fingerPosition, timeStamp, socket));
  }

  removePlayer(player) {
    this.__soloistManager.removePlayer(player);
  }

  touchHandler(type, fingerPosition, timeStamp, socket) {
    // console.log("\""+ type + "\" received from client " + socket.id + " with:\n" +
    //   "fingerPosition: { x: " + fingerPosition[0] + ", y: " + fingerPosition[1] + " }\n" +
    //   "timeStamp: " + timeStamp
    // );
    var h = this.__topologyManager.height;
    var w = this.__topologyManager.width;

    // Check if socket.id is still among the soloists.
    // Necessary because of network latency: sometimes,
    // the matrix is still on the display of the client,
    // he is no longer a performer on the server.)
    var index = this.__soloistManager.__soloists.map((s) => s.socket.id).indexOf(socket.id);
    if (index > -1) {
      let io = ioServer.io;
      let client = this.__clientManager.__sockets[socket.id];
      let soloistId = client.publicState.soloistId;
      let dSub = 1;
      let s = 0;

      switch (type) {

        case 'touchend':
          io.of('/play').in('performance').emit('update_synth', soloistId, 1, s);
          io.of('/room').emit('update_synth', soloistId, fingerPosition, 1, s);
          break;

        case 'touchmove':
          client.privateState.inputArray.push({
            position: fingerPosition,
            timeStamp: timeStamp
          });
          s = calculateVelocity(client.privateState.inputArray[client.privateState.inputArray.length - 1], client.privateState.inputArray[client.privateState.inputArray.length - 2], h, w);
          s = Math.min(1, s / 2); // TODO: have a better way to set the threshold
          for (let i = 0; i < this.__clientManager.__playing.length; i++) {
            let d = scaleDistance(calculateNormalizedDistance(this.__clientManager.__playing[i].position, fingerPosition, h, w), this.fingerRadius);
            this.__clientManager.__playing[i].socket.emit('update_synth', soloistId, d, s);
            if (dSub > d) dSub = d; // subwoofer distance calculation
          }
          io.of('/room').emit('update_synth', soloistId, fingerPosition, dSub, s);
          break;

        case 'touchstart':
          client.privateState.inputArray = [{
            position: fingerPosition,
            timeStamp: timeStamp
          }];
          for (let i = 0; i < this.__clientManager.__playing.length; i++) {
            let d = scaleDistance(calculateNormalizedDistance(this.__clientManager.__playing[i].position, fingerPosition, h, w), this.fingerRadius);
            this.__clientManager.__playing[i].socket.emit('update_synth', soloistId, d, 0);
            if (dSub > d) dSub = d; // subwoofer distance calculation
          }
          io.of('/room').emit('update_synth', soloistId, fingerPosition, dSub, s);
          break;

      }
    }
  }
}

module.exports = ServerPerform;