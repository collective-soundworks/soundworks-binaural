import * as soundworks from 'soundworks/client';
import PlayerExperience from './PlayerExperience';

// list of files to load (passed to the experience)
const audiofiles = [
  'sounds/source.wav',
  'sounds/shake.wav'
];

function bootstrap() {
  const { appName, clientType, socketIO }  = window.soundworksConfig;
  // initialize the 'player' client
  soundworks.client.init(clientType, { socketIO, appName });
  // instanciate the experience of the `player`
  const playerExperience = new PlayerExperience(audiofiles);
  // start the application
  soundworks.client.start();
}

window.addEventListener('load', bootstrap);
