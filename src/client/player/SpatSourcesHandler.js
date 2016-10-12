import * as binaural from 'binaural';
import * as soundworks from 'soundworks/client';

const audioContext = soundworks.audioContext;

export default class SpatSourcesHandler {
  constructor(buffer) {

    // create binaural panner
    this.numberOfSources = 2;
    const initPos = [0.0, 0.0, 1.0];
    this.binauralPanner = new binaural.audio.BinauralPanner({
        audioContext: audioContext,
        crossfadeDuration: 0.05, // in seconds
        coordinateSystem: 'spat4Spherical', // [azimuth, elevation, distance]
        sourceCount: 2,
        sourcePositions: [initPos, initPos], // initial position
    });

    // get HRTF
    const url = "hrtf/IRC_1037_C_HRIR_44100.sofa.json"
    this.binauralPanner.loadHrtfSet(url).then( () => {
        console.log('hrtf loaded:', url);
    })

    // create output gain node
    this.gainNode = audioContext.createGain();
    this.gainNode.gain.value = 1.0;

    // connect graph
    this.binauralPanner.connectOutputs(this.gainNode);
    this.gainNode.connect(audioContext.destination);

    // add constant source
    this.playSound(buffer, [1.0,0.0,1.0], 0, true);
  }

  playSound(buffer, pos, srcID = 1, loop = false){
    // create source
    var src = audioContext.createBufferSource();
    src.buffer = buffer;
    src.loop = loop;
    // connect graph
    // this.binauralPanner.disconnectInputByIndex(srcID, src);
    this.binauralPanner.connectInputByIndex(srcID, src);
    // set source pos
    this.binauralPanner.setSourcePositionByIndex(srcID, pos);
    this._updateBinauralPanner();
    // play source
    src.start(0);
  }

  setListenerOrientation(ori){

    // update sources orientation
    // for (let srcID = 0, pos = [0,0,0]; srcID < this.numberOfSources; srcID++) {
    //   pos = this.binauralPanner.getSourcePositionByIndex(srcID);
    //   pos[0] += this.ori[0];
    //   console.log('source:', srcID, ' - pos:', pos);
    //   this.binauralPanner.setSourcePositionByIndex(srcID, pos);
    // }
    // ori[0] = -ori[0];
    this.binauralPanner.listenerView = ori;
    console.log('listener ori:', this.binauralPanner.listenerView);
    this._updateBinauralPanner();
  }

  getListenerOrientation(){
    return this.binauralPanner.listenerView;
  }

  _updateBinauralPanner(){
    window.requestAnimationFrame(() => {
      // console.log('update bin:', )
        this.binauralPanner.update();
    });
  }
}
