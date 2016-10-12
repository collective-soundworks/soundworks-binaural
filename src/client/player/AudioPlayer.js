import * as binaural from 'binaural';
import * as soundworks from 'soundworks/client';

const audioContext = soundworks.audioContext;

export default class AudioPlayer {
  constructor() {

    // create local map
    this.srcMap = new Map();
    this.gainMap = new Map();

    // create output gain node
    this.gainNode = audioContext.createGain();
    this.gainNode.gain.value = 1.0;

    // connect graph
    this.gainNode.connect(audioContext.destination);
  }

  playSound(buffer, soundLvl, loop = false){

    // create audio source node
    var src = audioContext.createBufferSource();
    src.buffer = buffer;
    src.loop = loop;

    // create source specific gain node
    var gain = audioContext.createGain();
    gain.gain.value = Math.min(Math.abs(soundLvl),3.0);

    // connect graph
    src.connect(gain);
    gain.connect(this.gainNode);

    // start source
    src.start(0);

    // store nodes in local maps
    this.srcMap.set(buffer,src);
    this.gainMap.set(buffer,gain);

    // empty local maps of disused sources and associated gains
    src.onended = () => {
      // disconnect
      // this.gainMap.get(buffer).disconnect();
      //delete
      this.srcMap.delete(buffer);
      this.gainMap.delete(buffer);
      console.log('deleting audio source from local map');
    }

    // this.srcMap.forEach((value, key, map) => {
    // });

  }

}
